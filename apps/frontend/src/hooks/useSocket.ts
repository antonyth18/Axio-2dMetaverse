import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { avatarService } from "@/services/avatarService";
import { UserState } from "@/types";

const VALID_AVATAR_IDS = ["warrior", "mage", "rogue"] as const;
type AvatarId = (typeof VALID_AVATAR_IDS)[number];

const normalizeAvatarId = (value: unknown): AvatarId | null => {
    if (typeof value !== "string") return null;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    for (const avatarId of VALID_AVATAR_IDS) {
        if (normalized === avatarId) {
            return avatarId;
        }

        const matcher = new RegExp(`(?:^|[\\/_\\-.])${avatarId}(?:$|[\\/_\\-.])`);
        if (matcher.test(normalized)) {
            return avatarId;
        }
    }

    return null;
};

const extractAvatarId = (payload: any): AvatarId | null => {
    const candidates = [
        payload,
        payload?.avatarId,
        payload?.avatarKey,
        payload?.avatarName,
        payload?.name,
        payload?.key,
        payload?.id,
        payload?.avatar,
        payload?.avatar?.avatarId,
        payload?.avatar?.key,
        payload?.avatar?.name,
        payload?.avatar?.id,
        payload?.avatarUrl,
        payload?.idleUrls?.down,
        payload?.runUrls?.down,
        payload?.avatar?.idleUrls?.down,
        payload?.avatar?.runUrls?.down,
    ];

    for (const candidate of candidates) {
        const avatarId = normalizeAvatarId(candidate);
        if (avatarId) {
            return avatarId;
        }
    }

    return null;
};

interface UseSocketProps {
    url: string;
    token: string;
    roomCode: string | null;
    joinMetadata?: {
        backgroundUrl: string;
        width: number;
        height: number;
    } | null;
    onRoomCreated?: (code: string) => void;
}

export const useSocket = ({ url, token, roomCode, joinMetadata, onRoomCreated }: UseSocketProps) => {
    const socketRef = useRef<Socket | null>(null);
    const joinedRoomRef = useRef<string | null>(null);
    const avatarCacheRef = useRef<Record<string, AvatarId>>({});
    const avatarFetchInFlightRef = useRef<Set<string>>(new Set());
    const [players, setPlayers] = useState<Record<string, UserState>>({});
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [roomMetadata, setRoomMetadata] = useState<any>(null);
    const [selfId, setSelfId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    
    // Store callback in ref to prevent effect cycles
    const onRoomCreatedRef = useRef(onRoomCreated);
    useEffect(() => {
        onRoomCreatedRef.current = onRoomCreated;
    }, [onRoomCreated]);

    const applyAvatarToUser = useCallback((userId: string, avatarId: AvatarId) => {
        avatarCacheRef.current[userId] = avatarId;

        setPlayers((prev) => {
            let changed = false;
            const nextPlayers: Record<string, UserState> = { ...prev };

            Object.entries(prev).forEach(([playerId, player]) => {
                if (player.userId === userId && player.avatarId !== avatarId) {
                    nextPlayers[playerId] = {
                        ...player,
                        avatarId,
                    };
                    changed = true;
                }
            });

            return changed ? nextPlayers : prev;
        });
    }, []);

    const ensureAvatarForUser = useCallback(async (userId?: string) => {
        if (!userId) return;
        if (avatarCacheRef.current[userId]) return;
        if (avatarFetchInFlightRef.current.has(userId)) return;

        avatarFetchInFlightRef.current.add(userId);

        try {
            const avatar = await avatarService.getByUserId(userId);
            const avatarId = extractAvatarId(avatar);

            if (avatarId) {
                applyAvatarToUser(userId, avatarId);
            }
        } catch (error) {
            console.warn(`[SOCKET] Failed to hydrate avatar for user ${userId}`, error);
        } finally {
            avatarFetchInFlightRef.current.delete(userId);
        }
    }, [applyAvatarToUser]);

    const resolvePlayerAvatarId = useCallback((payload: any): AvatarId => {
        const payloadAvatarId = extractAvatarId(payload);
        if (payloadAvatarId) {
            if (payload?.userId) {
                avatarCacheRef.current[payload.userId] = payloadAvatarId;
            }
            return payloadAvatarId;
        }

        const cachedAvatarId = payload?.userId ? avatarCacheRef.current[payload.userId] : null;
        if (cachedAvatarId) {
            return cachedAvatarId;
        }

        void ensureAvatarForUser(payload?.userId);
        return "warrior";
    }, [ensureAvatarForUser]);

    useEffect(() => {
        if (!token) return;

        console.log(`[SOCKET] Connecting to ${url}`);
        joinedRoomRef.current = null;
        const socket = io(url, {
            transports: ['polling', 'websocket'],
            auth: { token },
            timeout: 20000,
            reconnectionAttempts: 5
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log(`[SOCKET] Successfully established connection to ${url}`);
            setIsConnected(true);
        });

        socket.on("connect_error", (err) => {
            console.error(`[SOCKET] Connection attempt failed to ${url}:`, err.message);
            setIsConnected(false);
        });

        socket.on("disconnect", (reason) => {
            console.warn(`[SOCKET] Disconnected from ${url}. Reason: ${reason}`);
            joinedRoomRef.current = null;
            setIsConnected(false);
        });

        socket.on("room-created", ({ roomCode }: { roomCode: string }) => {
            console.log(`[SOCKET] Room created event: ${roomCode}`);
            if (onRoomCreatedRef.current) onRoomCreatedRef.current(roomCode);
        });

        socket.on("room_joined", (data: { id: string, userId: string, x: number, y: number, avatar?: string }) => {
            console.log("[SOCKET] Successfully joined room as", data.id);
            const avatarId = resolvePlayerAvatarId(data);
            setSelfId(data.id);
            setPlayers({
                [data.id]: {
                    id: data.id,
                    userId: data.userId,
                    x: data.x,
                    y: data.y,
                    direction: "down",
                    avatarId
                }
            });
        });

        socket.on("arena-metadata-update", (metadata: any) => {
            console.log("[SOCKET] Received room metadata", metadata);
            setRoomMetadata(metadata);
        });

        socket.on("message-received", (chat: any) => {
            setChatMessages(prev => [...prev, chat]);
        });

        socket.on("existing_players", (existingPlayers: any[]) => {
            console.log("[SOCKET] Received existing players", existingPlayers);
            const playerState: Record<string, UserState> = {};
            existingPlayers.forEach(p => {
                const avatarId = resolvePlayerAvatarId(p);
                playerState[p.id] = {
                    id: p.id,
                    userId: p.userId,
                    x: p.x,
                    y: p.y,
                    direction: "down",
                    avatarId
                };
            });
            setPlayers(prev => ({ ...prev, ...playerState }));
        });

        socket.on("new_player", (player: any) => {
            console.log("[SOCKET] New player joined", player);
            const avatarId = resolvePlayerAvatarId(player);
            setPlayers(prev => ({
                ...prev,
                [player.id]: {
                    id: player.id,
                    userId: player.userId,
                    x: player.x,
                    y: player.y,
                    direction: "down",
                    avatarId
                }
            }));
        });

        socket.on("player_moved", (data: any) => {
            console.log(`[SOCKET] Received movement for ${data.id}: ${data.x},${data.y}`);
            setPlayers(prev => {
                const existing = prev[data.id];
                if (!existing) {
                    console.warn(`[SOCKET] Player ${data.id} moved but not found in local state!`);
                    return prev;
                }
                return {
                    ...prev,
                    [data.id]: {
                        ...existing,
                        x: data.x,
                        y: data.y,
                        direction: data.direction || existing.direction
                    }
                };
            });
        });

        socket.on("player_left", (data: any) => {
            console.log("[SOCKET] Player left", data.id);
            setPlayers(prev => {
                const next = { ...prev };
                delete next[data.id];
                return next;
            });
        });

        // Map userId from token if possible, or just wait for server to tell us?
        // For now, we'll assume we can decode it or we'll get it from a 'ready' event.
        // But the current implementation plan says use the ID from token.
        
        return () => {
            socket.disconnect();
            socketRef.current = null;
            joinedRoomRef.current = null;
            setIsConnected(false);
        };
    }, [url, token, resolvePlayerAvatarId]); // Removed onRoomCreated to prevent full reconnect cycles

    useEffect(() => {
        if (isConnected && roomCode && token && socketRef.current) {
            if (joinedRoomRef.current === roomCode) return;
            joinedRoomRef.current = roomCode;
            console.log(`[SOCKET] Room Code changed to ${roomCode}. Joining...`);
            socketRef.current.emit("join_room", { roomCode, token, metadata: joinMetadata ?? undefined });
        }
    }, [roomCode, isConnected, token, joinMetadata]);

    const createRoom = useCallback((metadata?: { backgroundUrl: string; width: number; height: number }) => {
        if (socketRef.current && isConnected) {
            console.log("[SOCKET] Emitting create_room request");
            socketRef.current.emit("create_room", metadata);
        }
    }, [isConnected]);

    const movePlayer = useCallback((x: number, y: number, direction: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit("player_move", { x, y, direction });
        }
    }, [isConnected]);

    const sendAction = useCallback((action: string, emoji?: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit("user-action", { action, emoji });
        }
    }, [isConnected]);

    const sendMessage = useCallback((message: string) => {
        if (socketRef.current && isConnected && message.trim()) {
            console.log(`[SOCKET] Sending chat: ${message}`);
            socketRef.current.emit("chat", { message });
        }
    }, [isConnected]);

    return {
        players,
        chatMessages,
        roomMetadata,
        movePlayer,
        sendAction,
        sendMessage,
        createRoom,
        isConnected,
        selfId: selfId
    };
};
