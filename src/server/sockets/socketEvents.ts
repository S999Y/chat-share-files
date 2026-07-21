import { Server, Socket } from "socket.io";
import { dbService } from "../services/dbService.js";

// Keep track of active users via socket.data

export function setupSocketEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Track room joining
    socket.on("join-room", async (data: { roomId: string; userId: string; username: string }) => {
      const { roomId, userId, username } = data;
      if (!roomId || !userId || !username) return;

      console.log(`👤 User ${username} joined room: ${roomId}`);
      
      // Store user info on the socket object
      socket.data.userId = userId;
      socket.data.username = username;

      // Leave any other rooms this socket was in
      const rooms = Array.from(socket.rooms);
      for (const r of rooms) {
        if (r !== socket.id) {
          socket.leave(r);
        }
      }

      // Join the new socket room
      socket.join(roomId);

      // Get updated list of online users using fetchSockets
      const socketsInRoom = await io.in(roomId).fetchSockets();
      const usersInRoom = socketsInRoom.map((s) => ({
        userId: s.data.userId,
        username: s.data.username,
        socketId: s.id,
      })).filter(u => u.userId);

      // Emit updated list of online users to all clients in this room
      io.to(roomId).emit("online-users", usersInRoom);

      // Broadcast join event as a system message
      socket.to(roomId).emit("user-joined", {
        userId,
        username,
        message: `${username} has joined the chat.`,
        timestamp: new Date(),
      });
    });

    // Handle incoming text/file messages
    socket.on("send-message", async (data: { roomId: string; userId: string; username: string; text: string; fileId?: string }) => {
      const { roomId, userId, username, text, fileId } = data;
      if (!roomId || !userId || !username) return;

      try {
        const savedMessage = await dbService.saveMessage(roomId, userId, username, text, fileId);
        
        // Broadcast the saved message to everyone in the room
        io.to(roomId).emit("receive-message", savedMessage);
      } catch (err) {
        console.error("Failed to save and broadcast message:", err);
        socket.emit("error-message", { error: "Failed to send message." });
      }
    });

    // Handle typing indicator
    socket.on("typing", (data: { roomId: string; username: string; isTyping: boolean }) => {
      const { roomId, username, isTyping } = data;
      socket.to(roomId).emit("user-typing", { username, isTyping });
    });

    // Handle leave room explicitly
    socket.on("leave-room", async (data: { roomId: string; userId: string; username: string }) => {
      const { roomId, userId, username } = data;
      if (!roomId) return;

      console.log(`👤 User ${username} left room: ${roomId}`);
      socket.leave(roomId);

      // Get updated list of online users using fetchSockets
      const socketsInRoom = await io.in(roomId).fetchSockets();
      const usersInRoom = socketsInRoom.map((s) => ({
        userId: s.data.userId,
        username: s.data.username,
        socketId: s.id,
      })).filter(u => u.userId);
        
      io.to(roomId).emit("online-users", usersInRoom);

      socket.to(roomId).emit("user-left", {
        userId,
        username,
        message: `${username} has left the chat.`,
        timestamp: new Date(),
      });
    });

    // Handle disconnecting (tab closed, refresh, etc.)
    socket.on("disconnecting", async () => {
      const rooms = Array.from(socket.rooms);
      
      for (const roomId of rooms) {
        if (roomId === socket.id) continue;

        // User is about to leave
        const leavingUserId = socket.data.userId;
        const leavingUsername = socket.data.username;

        socket.leave(roomId);

        // Get updated list of online users using fetchSockets
        const socketsInRoom = await io.in(roomId).fetchSockets();
        const usersInRoom = socketsInRoom.map((s) => ({
          userId: s.data.userId,
          username: s.data.username,
          socketId: s.id,
        })).filter(u => u.userId);
        
        io.to(roomId).emit("online-users", usersInRoom);

        if (leavingUserId) {
          socket.to(roomId).emit("user-left", {
            userId: leavingUserId,
            username: leavingUsername,
            message: `${leavingUsername} has left the chat.`,
            timestamp: new Date(),
          });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}
