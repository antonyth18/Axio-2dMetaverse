// services/websocket.ts
import type { IncomingMessage } from "@/types";

type MessageHandler = (msg: IncomingMessage) => void;

export class WebSocketService {
  private messageQueue: any[] = [];

  constructor(url: string, onMessage: MessageHandler) {
    this.url = url;
    this.onMessage = onMessage;
  }

  connect(token: string, spaceId?: string) {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WS] Connection opened");
      if (spaceId) {
        this.send({ type: "join", payload: { token, spaceId } });
      }
      // Flush queue
      while (this.messageQueue.length > 0) {
        const payload = this.messageQueue.shift();
        this.ws?.send(JSON.stringify(payload));
      }
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as IncomingMessage;
        this.onMessage(msg);
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    this.ws.onclose = () => {
      console.log("[WS] Connection closed");
      this.ws = null;
    };
  }

  send(payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      this.messageQueue.push(payload);
    }
  }

  createRoom() {
    this.send({ type: "create_room", payload: {} });
  }

  joinRoom(token: string, roomCode: string) {
    this.send({ type: "join_room", payload: { token, roomCode } });
  }

  move(x: number, y: number) {
    this.send({ type: "move", payload: { x, y } });
  }

  sendAction(action: string, emoji?: string) {
    this.send({ type: "user-action", payload: { action, emoji } });
  }

  sendMessage(message: string) {
    this.send({ type: "send-message", payload: { message } });
  }

  close() {
    this.ws?.close();
  }
}
