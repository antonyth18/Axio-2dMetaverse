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

// In-memory room state: roomCode -> players[]
const rooms: Map<string, Player[]> = new Map();
// Socket ID -> { userId, roomCode } for easier disconnect handling
const socketToUser: Map<string, { userId: string, roomCode: string }> = new Map();

export const setupHandlers = (io: Server, socket: Socket) => {
    
    socket.on("create_room", async () => {
        const roomCode = RoomManager.getInstance().generateRoomCode();
        RoomManager.getInstance().createRoom(roomCode);
        
        // Optionally set a default space if not already set
        try {
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

    socket.on("join_room", async ({ roomCode, token }) => {
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

        const roomPlayers = rooms.get(roomCode)!;
        
        // Remove player if this SPECIFIC connection was already in (unlikely but safe)
        const updatedPlayers = roomPlayers.filter(p => p.id !== socket.id);
        
        // Pick a spawn point
        const newPlayer: Player = {
            id: socket.id,
            userId: userId,
            x: Math.floor(Math.random() * 10),
            y: Math.floor(Math.random() * 10),
            avatar: "warrior" // Default
        };

        updatedPlayers.push(newPlayer);
        rooms.set(roomCode, updatedPlayers);
        socketToUser.set(socket.id, { userId, roomCode });

        // Fetch room metadata (Background, dimensions)
        // Check if RoomManager has a space assigned first
        let space = RoomManager.getInstance().getRoomSpace(roomCode);
        
        if (!space) {
            console.log(`[SOCKET] No space in RoomManager for ${roomCode}, fetching default...`);
            try {
                space = await dbClient.space.findFirst({
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
