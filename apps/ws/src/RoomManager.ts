import { OutgoingMessage } from "./types";
import type { User } from "./User";


export interface Room {
    users: User[];
    space?: any;
}

export class RoomManager {
    rooms: Map<string, Room> = new Map();
    static instance: RoomManager;

    private constructor() {
        this.rooms = new Map();
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new RoomManager();
        }
        return this.instance;
    }

    public generateRoomCode(): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code;
        do {
            code = "";
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(code));
        return code;
    }

    public createRoom(roomCode: string) {
        if (!this.rooms.has(roomCode)) {
            this.rooms.set(roomCode, { users: [] });
        }
    }

    public setRoomSpace(roomCode: string, space: any) {
        const room = this.rooms.get(roomCode);
        if (room) {
            room.space = space;
        }
    }

    public getRoomSpace(roomCode: string) {
        return this.rooms.get(roomCode)?.space;
    }

    public addUser(roomId: string, user: User) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, { users: [user] });
        } else {
            const room = this.rooms.get(roomId)!;
            room.users.push(user);
        }
    }

    public removeUser(user: User, roomId: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.users = room.users.filter((u) => u.id !== user.id);
        if (room.users.length === 0) {
            this.rooms.delete(roomId);
        }
    }

    public broadcast(message: OutgoingMessage, user: User, roomId: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.users.forEach((u) => {
            if (u.id !== user.id) {
                u.send(message);
            }
        });
    }

    public isUserInRoom(roomId: string, userId?: string): boolean {
        if (!userId || !this.rooms.has(roomId)) return false;
        return this.rooms.get(roomId)!.users.some(u => u.userId === userId);
    }
}