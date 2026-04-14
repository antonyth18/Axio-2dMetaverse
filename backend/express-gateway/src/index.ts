import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

interface PlayerData {
    playerId: string;
    x: number;
    y: number;
    direction: string;
    timestamp: number;
}

const players = new Map<string, PlayerData>();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Send existing players to the new player
    socket.emit('currentPlayers', Array.from(players.values()));

    socket.on('playerMoved', (movementData: PlayerData) => {
        // Ensure playerId is correctly set from the socket
        const updatedData = { ...movementData, playerId: socket.id };
        players.set(socket.id, updatedData);
        socket.broadcast.emit('playerMoved', updatedData);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        players.delete(socket.id);
        io.emit('playerLeft', socket.id);
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'express-gateway' });
});

httpServer.listen(port, () => {
    console.log(`Express gateway listening at http://localhost:${port}`);
});
