import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { UserState } from "@/types";

interface UseSocketProps {
    url: string;
    token: string;
    roomCode: string | null;
    onRoomCreated?: (code: string) => void;
}

export const useSocket = ({ url, token, roomCode, onRoomCreated }: UseSocketProps) => {
    const socketRef = useRef<Socket | null>(null);
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

    useEffect(() => {
        if (!token) return;

        console.log(`[SOCKET] Connecting to ${url}`);
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
            
            // If we already have a room code on connect, join immediately
            if (roomCode) {
                console.log(`[SOCKET] Auto-joining room: ${roomCode}`);
                socket.emit("join_room", { roomCode, token });
            }
        });

        socket.on("connect_error", (err) => {
            console.error(`[SOCKET] Connection attempt failed to ${url}:`, err.message);
            setIsConnected(false);
        });

        socket.on("disconnect", (reason) => {
            console.warn(`[SOCKET] Disconnected from ${url}. Reason: ${reason}`);
            setIsConnected(false);
        });

        socket.on("room-created", ({ roomCode }: { roomCode: string }) => {
            console.log(`[SOCKET] Room created event: ${roomCode}`);
            if (onRoomCreatedRef.current) onRoomCreatedRef.current(roomCode);
        });

        socket.on("room_joined", (data: { id: string, userId: string, x: number, y: number }) => {
            console.log("[SOCKET] Successfully joined room as", data.id);
            setSelfId(data.id);
            setPlayers(prev => ({
                ...prev,
                [data.id]: {
                    id: data.id,
                    userId: data.userId,
                    x: data.x,
                    y: data.y,
                    direction: "down"
                }
            }));
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
                playerState[p.id] = {
                    id: p.id,
                    userId: p.userId,
                    x: p.x,
                    y: p.y,
                    direction: "down"
                };
            });
            setPlayers(prev => ({ ...prev, ...playerState }));
        });

        socket.on("new_player", (player: any) => {
            console.log("[SOCKET] New player joined", player);
            setPlayers(prev => ({
                ...prev,
                [player.id]: {
                    id: player.id,
                    userId: player.userId,
                    x: player.x,
                    y: player.y,
                    direction: "down"
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
            setIsConnected(false);
        };
    }, [url, token]); // Removed onRoomCreated to prevent full reconnect cycles

    useEffect(() => {
        if (isConnected && roomCode && token && socketRef.current) {
            console.log(`[SOCKET] Room Code changed to ${roomCode}. Joining...`);
            socketRef.current.emit("join_room", { roomCode, token });
        }
    }, [roomCode, isConnected, token]);

    const createRoom = useCallback(() => {
        if (socketRef.current && isConnected) {
            console.log("[SOCKET] Emitting create_room request");
            socketRef.current.emit("create_room");
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
