import "./env";
import express from "express";
import cors from "cors";
import { router } from "./routes/v1";
import { PORT } from "./config";

const app = express();

// Apply CORS middleware before any routes
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Global Request Logger to help debug 403/Connectivity issues
app.use((req, res, next) => {
  console.log(`[GLOBAL] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// Simple health check for network testing
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use(express.json());
app.use("/api/v1", router);

app.listen(Number(PORT) || 3000, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
});


