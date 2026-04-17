// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { CELL_SIZE, EMOJI_DURATION, CHAT_DURATION } from "@/constants";
import type {
  UserState,
  AnimatedUserDisplayState,
  Emoji,
  ChatMessage,
  IncomingMessage,
} from "@/types";
import { WebSocketService } from "@/services/websocket";

interface UseWebSocketProps {
  url: string;
  token: string;
  spaceId: string;
  shouldConnect: boolean;
  loadUserAvatar: (userId: string) => Promise<void>;
}

export const useWebSocket = ({
  url,
  token,
  spaceId,
  shouldConnect,
  loadUserAvatar,
}: UseWebSocketProps) => {
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const [connected, setConnected] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, UserState>>({});
  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, AnimatedUserDisplayState>
  >({});
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMovingSelf, setIsMovingSelf] = useState(false);
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [roomMetadata, setRoomMetadata] = useState<{
    backgroundUrl: string;
    width: number;
    height: number;
  } | null>(null);
  const prevShouldConnectRef = useRef(false);

  const handleMessage = useCallback(
    (msg: IncomingMessage) => {
      switch (msg.type) {
        case "room-created":
          console.log("Room created:", msg.payload.roomCode);
          setCurrentRoomCode(msg.payload.roomCode);
          break;

        case "room-joined":
          console.log("Joined room:", msg.payload.roomCode, msg.payload.metadata);
          setCurrentRoomCode(msg.payload.roomCode);
          setRoomMetadata(msg.payload.metadata);
          setSelfId(msg.payload.userId);
          
          const roomUsers: Record<string, UserState> = {
            [msg.payload.userId]: {
              id: msg.payload.userId,
              x: msg.payload.spawn.x,
              y: msg.payload.spawn.y,
              direction: "down",
            }
          };
          if (msg.payload.users) {
            msg.payload.users.forEach((u: any) => {
              const id = u.userId;
              roomUsers[id] = { id, x: u.x, y: u.y, direction: "down" };
            });
          }
          setUsers(roomUsers);
          setConnected(true);
          
          setAnimatedPositions((prev) => {
            const pos = { ...prev };
            Object.entries(roomUsers).forEach(([id, user]) => {
              pos[id] = {
                currentPixelX: user.x * CELL_SIZE,
                currentPixelY: user.y * CELL_SIZE,
              };
            });
            return pos;
          });
          
          loadUserAvatar(msg.payload.userId);
          if (msg.payload.users) {
            msg.payload.users.forEach((u: any) => loadUserAvatar(u.userId));
          }
          break;

        case "space-joined":
          console.log("Joined space:", msg.payload);
          setSelfId(msg.payload.userId);
          
          const initialUsers: Record<string, UserState> = {
            [msg.payload.userId]: {
              id: msg.payload.userId,
              x: msg.payload.spawn.x,
              y: msg.payload.spawn.y,
              direction: "down",
            }
          };

          if (msg.payload.users) {
            msg.payload.users.forEach((u: any) => {
              const id = u.userId;
              initialUsers[id] = { id, x: u.x, y: u.y, direction: "down" };
            });
          }

          setUsers(initialUsers);
          setConnected(true);
          
          setAnimatedPositions((prev) => {
            const pos = { ...prev };
            Object.entries(initialUsers).forEach(([id, user]) => {
              pos[id] = {
                currentPixelX: user.x * CELL_SIZE,
                currentPixelY: user.y * CELL_SIZE,
              };
            });
            return pos;
          });

          loadUserAvatar(msg.payload.userId);
          if (msg.payload.users) {
            msg.payload.users.forEach((u: any) => loadUserAvatar(u.userId));
          }
          break;

        case "user-joined":
          setUsers((prev) => ({
            ...prev,
            [msg.payload.userId]: {
              id: msg.payload.userId,
              x: msg.payload.x,
              y: msg.payload.y,
              direction: "down",
            },
          }));
          setAnimatedPositions((prev) => ({
            ...prev,
            [msg.payload.userId]: {
              currentPixelX: msg.payload.x * CELL_SIZE,
              currentPixelY: msg.payload.y * CELL_SIZE,
            },
          }));
          loadUserAvatar(msg.payload.userId);
          break;

        case "user-moved":
          setUsers((prev) => {
            const old = prev[msg.payload.userId];
            if (!old) return prev;
            const dx = msg.payload.x - old.x;
            const dy = msg.payload.y - old.y;
            let direction: "up" | "down" | "left" | "right" = old.direction;
            if (dx === 1) direction = "right";
            else if (dx === -1) direction = "left";
            else if (dy === 1) direction = "down";
            else if (dy === -1) direction = "up";
            return {
              ...prev,
              [msg.payload.userId]: {
                ...old,
                x: msg.payload.x,
                y: msg.payload.y,
                direction,
              },
            };
          });
          setIsMovingSelf(false);
          break;

        case "movement-rejected":
          // Reset movement lock on rejection
          setIsMovingSelf(false);
          break;

        case "user-left":
          setUsers((prev) => {
            const updated = { ...prev };
            delete updated[msg.payload.userId];
            return updated;
          });
          setAnimatedPositions((prev) => {
            const updated = { ...prev };
            delete updated[msg.payload.userId];
            return updated;
          });
          break;

        case "user-action":
          if (msg.payload.action === "show-emoji" && msg.payload.emoji) {
            setEmojis((prev) => [
              ...prev.filter((e) => e.userId !== msg.payload.userId),
              {
                userId: msg.payload.userId,
                emoji: msg.payload.emoji ?? "",
                expiresAt: Date.now() + EMOJI_DURATION,
              },
            ]);
          }
          break;

        case "message-received":
          setChatMessages((prev) => [
            ...prev,
            {
              userId: msg.payload.userId,
              message: msg.payload.message,
              expiresAt: Date.now() + CHAT_DURATION,
            },
          ]);
          break;

        case "error":
          setError(msg.payload.message);
          setIsMovingSelf(false);
          break;
      }
    },
    [loadUserAvatar],
  );

  useEffect(() => {
    // Only auto-connect-and-join if we have a valid spaceId.
    // Otherwise, we wait for a manual joinRoom or createRoom call.
    const shouldConnectNow = shouldConnect && !!token && !!spaceId;
    const wasConnecting = prevShouldConnectRef.current;

    if (shouldConnectNow && !wasConnecting && !connected) {
      const wsService = new WebSocketService(url, handleMessage);
      wsServiceRef.current = wsService;
      wsService.connect(token, spaceId);
    } else if (shouldConnect && !!token && !spaceId && !wasConnecting && !connected) {
      // Connect without auto-joining a space (for arena rooms)
      const wsService = new WebSocketService(url, handleMessage);
      wsServiceRef.current = wsService;
      wsService.connect(token);
    }
    prevShouldConnectRef.current = shouldConnectNow || (shouldConnect && !!token && !spaceId);

    return () => {
      if (!shouldConnect && wsServiceRef.current) {
        wsServiceRef.current.close();
        wsServiceRef.current = null;
        setConnected(false);
      }
    };
  }, [shouldConnect, token, spaceId, url, handleMessage, connected]);

  const moveUser = useCallback(
    (x: number, y: number) => {
      if (!selfId || !connected || isMovingSelf || !users[selfId]) return;
      setIsMovingSelf(true);
      
      // Update direction immediately for visual feedback
      setUsers((prev) => {
        if (!prev[selfId]) return prev;
        const dx = x - prev[selfId].x;
        const dy = y - prev[selfId].y;
        let direction = prev[selfId].direction;
        if (dx === 1) direction = "right";
        else if (dx === -1) direction = "left";
        else if (dy === 1) direction = "down";
        else if (dy === -1) direction = "up";
        return { ...prev, [selfId]: { ...prev[selfId], direction } };
      });
      
      // Send move request to server (position will update only on server approval)
      wsServiceRef.current?.move(x, y);
      
      // Fallback timeout to reset movement lock if server doesn't respond
      setTimeout(() => setIsMovingSelf(false), 300);
    },
    [selfId, connected, isMovingSelf, users],
  );

  const sendAction = useCallback(
    (action: string, emoji?: string) => {
      if (!selfId || !connected) return;
      wsServiceRef.current?.sendAction(action, emoji);
    },
    [selfId, connected],
  );

  const sendMessage = useCallback(
    (message: string) => {
      if (!connected || !message.trim()) return;
      wsServiceRef.current?.sendMessage(message);
    },
    [connected],
  );

  const createRoom = useCallback(() => {
    wsServiceRef.current?.createRoom();
  }, []);

  const joinRoom = useCallback((roomCode: string) => {
    if (!token || !roomCode) return;
    wsServiceRef.current?.joinRoom(token, roomCode);
  }, [token]);

  return {
    connected,
    setConnected,
    selfId,
    users,
    animatedPositions,
    setAnimatedPositions,
    emojis,
    setEmojis,
    chatMessages,
    setChatMessages,
    error,
    isMovingSelf,
    currentRoomCode,
    roomMetadata,
    moveUser,
    sendAction,
    sendMessage,
    createRoom,
    joinRoom,
  };
};
