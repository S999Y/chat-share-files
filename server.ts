import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

import { connectDatabase, isMockDatabase, dbConnectionError, dbService } from "./src/server/services/dbService.js";
import authRoutes from "./src/server/routes/authRoutes.js";
import roomRoutes from "./src/server/routes/roomRoutes.js";
import fileRoutes from "./src/server/routes/fileRoutes.js";
import { setupSocketEvents } from "./src/server/sockets/socketEvents.js";
import { maxFileSize, formatBytes } from "./src/server/middleware/upload.js";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Initialize DB Connection (real MongoDB Atlas or fallback to memory mock)
  await connectDatabase();

  // Basic Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS headers (required for some iframe/dev environments)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With, X-File-Password");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // API Status Endpoint
  app.get("/api/status", (req, res) => {
    res.json({
      status: "ok",
      isMock: isMockDatabase,
      error: dbConnectionError,
      maxFileSize: maxFileSize,
      maxFileSizeFormatted: formatBytes(maxFileSize),
    });
  });

  // Mount API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/files", fileRoutes);

  // Initialize Socket.io Server
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  app.set("io", io);
  setupSocketEvents(io);

  // Background Cleanup: Auto-delete expired temporary rooms every 60 seconds
  setInterval(async () => {
    try {
      const expiredRooms = await dbService.getExpiredRooms();
      for (const room of expiredRooms) {
        console.log(`⏰ Room ${room.code} has expired. Performing auto-deletion...`);
        const success = await dbService.deleteRoom(room.code, room.creatorId);
        if (success) {
          io.emit("room-deleted", { roomCode: room.code });
          console.log(`✅ Auto-deleted expired room ${room.code}`);
        }
      }
    } catch (err) {
      console.error("Error in temporary room auto-cleanup:", err);
    }
  }, 60 * 1000);

  // Serve Frontend / Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Running in DEVELOPMENT mode. Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("🚀 Running in PRODUCTION mode. Serving pre-compiled static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("🔥 Server Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "An unexpected server-side error occurred.",
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("💥 Failed to start fullstack server:", err);
});
