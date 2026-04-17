
import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { OutgoingMessage } from "./types";
import { dbClient } from "@repo/db/client";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";

function getRandomString(length: number) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

interface SpaceElement {
  x: number;
  y: number;
  mapElement: {
    width: number;
    height: number;
    static: boolean;
  };
}

interface Space {
  id: string;
  width: number;
  height: number;
  elements: SpaceElement[];
}

export class User {
  private RENDER_CHARACTER_WIDTH = 50;
  private RENDER_CHARACTER_HEIGHT = 100;
  private ws: WebSocket;
  public id: string; // socket/session ID
  public userId?: string; // JWT user ID
  private spaceId?: string;
  private x: number;
  private y: number;
  private spaceWidth: number = 0;
  private spaceHeight: number = 0;
  private CELL_SIZE = 20; // Grid cell size in pixels, matching client
  private space: any;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.id = getRandomString(10);
    this.x = 0;
    this.y = 0;
    this.initHandlers();
  }

  private isValidSpawn(x: number, y: number): boolean {
    const userLeft = x * this.CELL_SIZE;
    const userTop = y * this.CELL_SIZE;
    const userRight = userLeft + this.RENDER_CHARACTER_WIDTH;
    const userBottom = userTop + this.RENDER_CHARACTER_HEIGHT;
    // Check if user fits within arena boundaries
    if (
      userLeft < 0 ||
      userTop < 0 ||
      userRight > this.spaceWidth ||
      userBottom > this.spaceHeight
    ) {
      return false;
    }
    // Check for overlap with static elements
    return !this.space.elements.some((el) => {
      if (!el.mapElement.static) return false;
      const elLeft = el.x;
      const elRight = el.x + el.mapElement.width;
      const elTop = el.y;
      const elBottom = el.y + el.mapElement.height;
      return (
        userLeft < elRight &&
        userRight > elLeft &&
        userTop < elBottom &&
        userBottom > elTop
      );
    });
  }

  initHandlers() {
    this.ws.on("message", async (data) => {
      try {
        const parseData = JSON.parse(data.toString());
        switch (parseData.type) {
          case "create_room": {
            const roomCode = RoomManager.getInstance().generateRoomCode();
            RoomManager.getInstance().createRoom(roomCode);
            
            // Pick a consistent space for this arena
            const defaultSpace = await dbClient.space.findFirst({
              include: { elements: { include: { mapElement: true } } }
            });
            if (defaultSpace) {
                RoomManager.getInstance().setRoomSpace(roomCode, defaultSpace);
            }

            this.send({
              type: "room-created",
              payload: { roomCode },
            });
            break;
          }
          case "join_room": {
            const { roomCode, token } = parseData.payload;
            console.log(`[WS:JOIN_ROOM] Request for Code: ${roomCode}`);

            let payload;
            try {
              payload = jwt.verify(token, JWT_PASSWORD) as { id: string };
            } catch (err) {
              console.error(`[WS:JOIN_ROOM] JWT Verification Failed`);
              this.ws.close();
              return;
            }
            this.userId = payload.id;

            const roomManager = RoomManager.getInstance();
            if (!roomManager.rooms.has(roomCode)) {
              this.send({ type: "error", payload: { message: "Room not found" } });
              return;
            }

            // Retrieve the shared space from the room manager
            const sharedSpace = roomManager.getRoomSpace(roomCode);

            if (!sharedSpace) {
              this.send({ type: "error", payload: { message: "Arena space not initialized" } });
              return;
            }

            this.space = sharedSpace;
            this.spaceId = roomCode; // Using roomCode as the room identifier
            this.spaceWidth = this.space.width;
            this.spaceHeight = this.space.height;
            roomManager.addUser(roomCode, this);

            // Spawn logic
            this.x = Math.floor(Math.random() * 10);
            this.y = Math.floor(Math.random() * 10);

            const existing = (roomManager.rooms.get(roomCode)?.users || [])
              .filter(u => u.userId !== this.userId)
              .map(u => ({ id: u.userId, x: u.x, y: u.y }));

            this.send({
              type: "room-joined",
              payload: {
                userId: this.userId,
                roomCode,
                spawn: { x: this.x, y: this.y },
                users: existing.map(u => ({ userId: u.id, x: u.x, y: u.y })), // Ensure userId is the key
                metadata: {
                    backgroundUrl: this.space.backgroundUrl || 'public',
                    width: this.space.width,
                    height: this.space.height
                }
              },
            });

            roomManager.broadcast({
              type: "user-joined",
              payload: { userId: this.userId, x: this.x, y: this.y },
            }, this, roomCode);
            break;
          }
          case "join": {
            const { spaceId, token } = parseData.payload;
            console.log(`[WS:JOIN] Request for Space: ${spaceId}`);

            let payload;
            try {
              payload = jwt.verify(token, JWT_PASSWORD) as { id: string };
              console.log(`[WS:JOIN] JWT Verified for User: ${payload.id}`);
            } catch (err) {
              console.error(`[WS:JOIN] JWT Verification Failed:`, err);
              this.ws.close();
              return;
            }
            this.userId = payload.id;

            try {
              this.space = await dbClient.space.findUnique({
                where: { id: spaceId },
                include: {
                  elements: {
                    select: {
                      id: true,
                      x: true,
                      y: true,
                      mapElement: {
                        select: {
                          id: true,
                          imageUrl: true,
                          width: true,
                          height: true,
                          static: true,
                        },
                      },
                    },
                  },
                },
              });
              console.log(`[WS:JOIN] Space lookup result: ${this.space ? "Found" : "Not Found"}`);
            } catch (dbErr) {
              console.error(`[WS:JOIN] DB Lookup Error:`, dbErr);
              this.send({ type: "error", payload: { message: "Internal server error during join" } });
              return;
            }

            if (!this.space) {
              this.send({ type: "error", payload: { message: "Space not found" } });
              return;
            }

            const roomManager = RoomManager.getInstance();
            const room = roomManager.rooms.get(spaceId);
            if (room) {
              const existingUsers = room.users.filter(u => u.userId === this.userId);
              existingUsers.forEach(existingUser => {
                existingUser.destroy();
              });
            }

            this.spaceId = spaceId;
            roomManager.addUser(spaceId, this);
            this.spaceWidth = this.space.width;
            this.spaceHeight = this.space.height;

            // Improved spawn logic
            const maxX = Math.floor((this.spaceWidth - this.RENDER_CHARACTER_WIDTH) / this.CELL_SIZE);
            const maxY = Math.floor((this.spaceHeight - this.RENDER_CHARACTER_HEIGHT) / this.CELL_SIZE);
            let attempts = 0;
            const maxAttempts = 100;
            do {
              this.x = Math.floor(Math.random() * (maxX + 1));
              this.y = Math.floor(Math.random() * (maxY + 1));
              attempts++;
            } while (!this.isValidSpawn(this.x, this.y) && attempts < maxAttempts);

            if (attempts >= maxAttempts) {
              this.ws.send(JSON.stringify({ type: "error", payload: { message: "No valid spawn position found" } }));
              this.ws.close();
              return;
            }


            const existing = (roomManager.rooms.get(spaceId)?.users || [])
              .filter((u) => u.userId !== this.userId)
              .map((u) => ({ userId: u.userId, x: u.x, y: u.y }));

            this.send({
              type: "space-joined",
              payload: {
                userId: this.userId,
                spawn: { x: this.x, y: this.y },
                users: existing,
              },
            });

            roomManager.broadcast(
              {
                type: "user-joined",
                payload: { userId: this.userId, x: this.x, y: this.y },
              },
              this,
              spaceId
            );
            break;
          }
          case "move": {
            const { x: movX, y: movY } = parseData.payload;

            if (!this.spaceId) {
              this.send({
                type: "movement-rejected",
                payload: { x: this.x, y: this.y },
              });
              break;
            }

            const inBounds =
              movX >= 0 &&
              movY >= 0 &&
              movX < this.spaceWidth / this.CELL_SIZE &&
              movY < this.spaceHeight / this.CELL_SIZE;

            const xDisplacement = Math.abs(this.x - movX);
            const yDisplacement = Math.abs(this.y - movY);
            const isValidMove =
              (xDisplacement === 1 && yDisplacement === 0) ||
              (xDisplacement === 0 && yDisplacement === 1);

            let overlaps = false;
            if (inBounds && isValidMove) {
              const userLeft = movX * this.CELL_SIZE;
              const userRight = userLeft + this.RENDER_CHARACTER_WIDTH;
              const userTop = movY * this.CELL_SIZE;
              const userBottom = userTop + this.RENDER_CHARACTER_HEIGHT;

              overlaps = this.space.elements.some((el) => {
                if (!el.mapElement.static) return false;
                const elLeft = el.x;
                const elRight = el.x + el.mapElement.width;
                const elTop = el.y;
                const elBottom = el.y + el.mapElement.height;
                return (
                  userLeft < elRight &&
                  userRight > elLeft &&
                  userTop < elBottom &&
                  userBottom > elTop
                );
              });
            }

            if (inBounds && isValidMove && !overlaps) {
              this.x = movX;
              this.y = movY;
              RoomManager.getInstance().broadcast(
                {
                  type: "user-moved",
                  payload: { userId: this.userId, x: this.x, y: this.y },
                },
                this,
                this.spaceId
              );
              this.send({
                type: "user-moved",
                payload: { userId: this.userId, x: this.x, y: this.y },
              });
            } else {
              this.send({
                type: "movement-rejected",
                payload: { x: this.x, y: this.y },
              });
            }
            break;
          }
          case "user-action": {
            const { action, emoji } = parseData.payload;
            if (action === "show-emoji" && this.spaceId && typeof emoji === "string") {
              const message = {
                type: "user-action",
                payload: { action: "show-emoji", userId: this.userId, emoji },
              };
              RoomManager.getInstance().broadcast(message, this, this.spaceId);
              this.send(message);
            }
            break;
          }
          case "send-message": {
            const { message } = parseData.payload;
            if (this.spaceId && typeof message === "string" && message.length <= 100) {
              RoomManager.getInstance().broadcast(
                {
                  type: "message-received",
                  payload: { userId: this.userId, message },
                },
                this,
                this.spaceId
              );
              // Optionally send confirmation back to the sender
              this.send({
                type: "message-received",
                payload: { userId: this.userId, message },
              });
            } else {
              this.send({ type: "error", payload: { message: "Invalid message" } });
            }
            break;
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
        this.send({ type: "error", payload: { message: "Invalid message format" } });
      }
    });

    this.ws.on("close", () => this.destroy());
  }

  destroy() {
    if (!this.spaceId) return;
    RoomManager.getInstance().broadcast(
      { type: "user-left", payload: { userId: this.userId } },
      this,
      this.spaceId
    );
    RoomManager.getInstance().removeUser(this, this.spaceId);
  }

  send(payload: OutgoingMessage) {
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }
}