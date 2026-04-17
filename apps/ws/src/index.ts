import "./env";
import { Server } from "socket.io";
import { createServer } from "http";
import { PORT } from "./config";
import { setupHandlers } from "./handlers/socketHandler";

const port = typeof PORT === "string" ? parseInt(PORT, 10) : PORT || 8081;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`[SOCKET] User connected: ${socket.id}`);
  setupHandlers(io, socket);
});

console.log(`[BACKEND] Starting Socket.IO server on port ${port}...`);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[BACKEND] Socket.IO server is running on port ${port} (0.0.0.0)`);
  console.log(`[BACKEND] Ready for connections!`);
});
