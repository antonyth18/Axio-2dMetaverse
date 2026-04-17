import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../config";
import { dbClient } from "@repo/db/client";
import { RoomManager } from "../RoomManager";

interface Player {
    id: string; // socket.id
    userId: string;
    x: number;
    y: number;
    avatar: string;
}

const CELL_SIZE = 20;
const PLAYER_WIDTH = 48;
const PLAYER_HEIGHT = 64;

const clamp = (value: number, min: number, max: number) => {
    if (max < min) return max;
    return Math.max(min, Math.min(max, value));
};

const normaliseArenaMetadata = (metadata?: any) => {
    if (!metadata || typeof metadata !== "object") return null;

    const width = Number(metadata.width);
    const height = Number(metadata.height);
    const backgroundUrl = typeof metadata.backgroundUrl === "string"
        ? metadata.backgroundUrl
        : undefined;

    if (!backgroundUrl || !Number.isFinite(width) || !Number.isFinite(height)) {
        return null;
    }

    return {
        backgroundUrl,
        width: Math.max(PLAYER_WIDTH, Math.floor(width)),
        height: Math.max(PLAYER_HEIGHT, Math.floor(height)),
        elements: []
    };
};

const isSpawnClear = (x: number, y: number, space: any, roomPlayers: Player[]) => {
    const width = Number(space?.width) || 800;
    const height = Number(space?.height) || 600;
    const playerLeft = x * CELL_SIZE;
    const playerTop = y * CELL_SIZE;
    const playerRight = playerLeft + PLAYER_WIDTH;
    const playerBottom = playerTop + PLAYER_HEIGHT;

    if (playerLeft < 0 || playerTop < 0 || playerRight > width || playerBottom > height) {
        return false;
    }

    const overlapsStaticElement = (space?.elements || []).some((el: any) => {
        if (!el?.mapElement?.static) return false;

        const elLeft = Number(el.x) || 0;
        const elTop = Number(el.y) || 0;
        const elWidth = Number(el.mapElement.width) || Number(el.width) || 0;
        const elHeight = Number(el.mapElement.height) || Number(el.height) || 0;

        return (
            playerLeft < elLeft + elWidth &&
            playerRight > elLeft &&
            playerTop < elTop + elHeight &&
            playerBottom > elTop
        );
    });

    if (overlapsStaticElement) return false;

    return !roomPlayers.some((player) => {
        const otherLeft = player.x * CELL_SIZE;
        const otherTop = player.y * CELL_SIZE;

        return Math.abs(otherLeft - playerLeft) < PLAYER_WIDTH &&
            Math.abs(otherTop - playerTop) < PLAYER_HEIGHT;
    });
};

const getSpawnPoint = (space: any, roomPlayers: Player[]) => {
    const width = Number(space?.width) || 800;
    const height = Number(space?.height) || 600;
    const maxX = Math.max(0, Math.floor((width - PLAYER_WIDTH) / CELL_SIZE));
    const maxY = Math.max(0, Math.floor((height - PLAYER_HEIGHT) / CELL_SIZE));
    const centerX = clamp(Math.floor(width / CELL_SIZE / 2), 0, maxX);
    const centerY = clamp(Math.floor(height / CELL_SIZE / 2), 0, maxY);

    const offsets = [
        [0, 0],
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
        [3, 2],
        [-3, 2],
        [3, -2],
        [-3, -2],
        [5, 0],
        [-5, 0],
    ];

    for (const [dx, dy] of offsets) {
        const x = clamp(centerX + dx, 0, maxX);
        const y = clamp(centerY + dy, 0, maxY);
        if (isSpawnClear(x, y, space, roomPlayers)) {
            return { x, y };
        }
    }

    return { x: centerX, y: centerY };
};

// In-memory room state: roomCode -> players[]
const rooms: Map<string, Player[]> = new Map();
// Socket ID -> { userId, roomCode } for easier disconnect handling
const socketToUser: Map<string, { userId: string, roomCode: string }> = new Map();

export const setupHandlers = (io: Server, socket: Socket) => {
    
    socket.on("create_room", async (metadata) => {
        const roomCode = RoomManager.getInstance().generateRoomCode();
        RoomManager.getInstance().createRoom(roomCode);
        
        const selectedSpace = normaliseArenaMetadata(metadata);
        if (selectedSpace) {
            RoomManager.getInstance().setRoomSpace(roomCode, selectedSpace);
        }

        // Optionally set a default space if not already set
        try {
            if (selectedSpace) {
                socket.emit("room-created", { roomCode });
                console.log(`[SOCKET] Room created: ${roomCode}`);
                return;
            }

            const space = await dbClient.space.findFirst({
                include: { elements: { include: { mapElement: true } } }
            });
            if (space) {
                RoomManager.getInstance().setRoomSpace(roomCode, space);
            }
        } catch (err) {
            console.error("[SOCKET] Database error during room creation:", err);
            // Non-critical: the room will use a fallback on join if space is missing
        }

        socket.emit("room-created", { roomCode });
        console.log(`[SOCKET] Room created: ${roomCode}`);
    });

    socket.on("join_room", async ({ roomCode, token, metadata: clientMetadata }) => {
        console.log(`[SOCKET] join_room request for ${roomCode}`);
        
        let payload: any;
        try {
            payload = jwt.verify(token, JWT_PASSWORD as string);
        } catch (err) {
            socket.emit("error", { message: "Unauthorized" });
            return;
        }

        const userId = payload.id;
        socket.join(roomCode);

        // Initialize room if it doesn't exist
        if (!rooms.has(roomCode)) {
            rooms.set(roomCode, []);
        }
        RoomManager.getInstance().createRoom(roomCode);

        const roomPlayers = rooms.get(roomCode)!;
        
        // Remove player if this SPECIFIC connection was already in (unlikely but safe)
        const updatedPlayers = roomPlayers.filter(p => p.id !== socket.id);

        const selectedSpace = normaliseArenaMetadata(clientMetadata);
        if (selectedSpace) {
            RoomManager.getInstance().setRoomSpace(roomCode, selectedSpace);
        }

        // Fetch room metadata (Background, dimensions)
        // Check if RoomManager has a space assigned first
        let space = RoomManager.getInstance().getRoomSpace(roomCode);
        
        if (!space) {
            console.log(`[SOCKET] No space in RoomManager for ${roomCode}, fetching default...`);
            try {
                space = await dbClient.space.findUnique({
                    where: { id: roomCode },
                    include: { elements: { include: { mapElement: true } } }
                }) ?? await dbClient.space.findFirst({
                    include: { elements: { include: { mapElement: true } } }
                });
            } catch (err) {
                console.error("[SOCKET] Database connection failed on join:", err);
                // We will fall back to safe defaults below if space is still null
            }
        }

        const metadata = {
            backgroundUrl: space?.backgroundUrl || 'office', // Default to office if DB fails
            width: space?.width || 800,
            height: space?.height || 600
        };
        
        // Pick a visible spawn point near the center of the arena instead of
        // burying new players in the top-left corner of image backgrounds.
        const spawn = getSpawnPoint(space || metadata, updatedPlayers);
        const newPlayer: Player = {
            id: socket.id,
            userId: userId,
            x: spawn.x,
            y: spawn.y,
            avatar: "warrior" // Default
        };

        updatedPlayers.push(newPlayer);
        rooms.set(roomCode, updatedPlayers);
        socketToUser.set(socket.id, { userId, roomCode });

        // 1. Send confirmation and spawn info to the joining user
        socket.emit("room_joined", {
            id: socket.id,
            userId,
            x: newPlayer.x,
            y: newPlayer.y
        });

        // 2. Send existing players (others) to the new user
        socket.emit("existing_players", updatedPlayers.filter(p => p.id !== socket.id));

        // 3. Send room metadata
        socket.emit("arena-metadata-update", metadata);

        // 4. Broadcast new player to others in the room
        socket.to(roomCode).emit("new_player", newPlayer);

        console.log(`[SOCKET] User ${userId} (${socket.id}) joined room ${roomCode}`);
    });

    socket.on("player_move", ({ x, y, direction }) => {
        const user = socketToUser.get(socket.id);
        if (!user) return;

        const { roomCode, userId } = user;
        const roomPlayers = rooms.get(roomCode);
        if (!roomPlayers) return;

        const player = roomPlayers.find(p => p.id === socket.id);
        if (player) {
            player.x = x;
            player.y = y;
            
            console.log(`[SOCKET] User ${userId} (${socket.id}) moved to ${x},${y} in room ${roomCode}`);

            // Broadcast movement to others in the room
            socket.to(roomCode).emit("player_moved", { 
                id: socket.id, 
                x, 
                y, 
                direction 
            });
        }
    });

    socket.on("chat", ({ message }) => {
        const user = socketToUser.get(socket.id);
        if (!user) return;

        const { roomCode } = user;
        console.log(`[SOCKET] Chat in ${roomCode} from ${socket.id}: ${message}`);
        
        // Broadcast to everyone in the room including sender
        io.to(roomCode).emit("message-received", {
            id: socket.id,
            message
        });
    });

    socket.on("disconnect", () => {
        const user = socketToUser.get(socket.id);
        if (!user) return;

        const { userId, roomCode } = user;
        console.log(`[SOCKET] Connection ${socket.id} (User: ${userId}) disconnected from ${roomCode}`);

        const roomPlayers = rooms.get(roomCode);
        if (roomPlayers) {
            const updated = roomPlayers.filter(p => p.id !== socket.id);
            if (updated.length === 0) {
                rooms.delete(roomCode);
            } else {
                rooms.set(roomCode, updated);
            }
        }

        socketToUser.delete(socket.id);
        
        // Inform others
        socket.to(roomCode).emit("player_left", { id: socket.id });
    });
};
