import mongoose from "mongoose";
import crypto from "crypto";
import { initMongooseModels, UserModel, RoomModel, MessageModel, FileModel } from "../models/Schemas.js";

// Connection State
export let isMockDatabase = true;
export let dbConnectionError: string | null = null;

// In-Memory Storage Fallback
const mockUsers: any[] = [];
const mockRooms: any[] = [];
const mockMessages: any[] = [];
const mockFiles: any[] = [];
const mockFileBuffers = new Map<string, Buffer>();

// Initialize Database connection
export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === "" || uri.includes("MY_MONGODB_URI")) {
    console.warn("⚠️ No MONGODB_URI found or configured in .env. Running in Memory Mock Storage Mode.");
    isMockDatabase = true;
    return false;
  }

  try {
    console.log("🔌 Connecting to MongoDB Atlas...");
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Successfully connected to MongoDB Atlas!");
    initMongooseModels(conn.connection);
    isMockDatabase = false;
    dbConnectionError = null;
    return true;
  } catch (err: any) {
    console.error("❌ MongoDB connection failed:", err.message);
    dbConnectionError = err.message;
    isMockDatabase = true;
    console.warn("⚠️ Falling back to Memory Mock Storage Mode so application remains active.");
    return false;
  }
}

// Data Access Service Layer
export const dbService = {
  // --- USERS ---
  async createUser(username: string, email: string, passwordHash: string) {
    if (!isMockDatabase) {
      const user = new UserModel({ username, email, passwordHash });
      await user.save();
      return {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      };
    } else {
      const existingUser = mockUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
      );
      if (existingUser) {
        throw new Error("Username or Email already exists in mock store.");
      }
      const newUser = {
        _id: crypto.randomUUID(),
        username,
        email,
        passwordHash,
        createdAt: new Date(),
      };
      mockUsers.push(newUser);
      return {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt,
      };
    }
  },

  async findUserByEmail(email: string) {
    if (!isMockDatabase) {
      const user = await UserModel.findOne({ email });
      if (!user) return null;
      return {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
      };
    } else {
      const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return user || null;
    }
  },

  async findUserById(id: string) {
    if (!isMockDatabase) {
      const user = await UserModel.findById(id);
      if (!user) return null;
      return {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      };
    } else {
      const user = mockUsers.find((u) => u._id === id);
      if (!user) return null;
      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      };
    }
  },

  // --- ROOMS ---
  async createRoom(name: string, creatorId: string, creatorName: string, isPrivate: boolean = false, joinPolicy: "direct" | "approval" = "direct", isTemporary: boolean = false) {
    // Generate unique 6-character alphanumeric room code
    let code = "";
    let attempts = 0;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    while (attempts < 20) {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.findRoomByCode(code);
      if (!existing) break;
      attempts++;
    }

    const expiresAt = isTemporary ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

    if (!isMockDatabase) {
      const room = new RoomModel({
        code,
        name,
        creatorId,
        creatorName,
        isPrivate,
        joinPolicy,
        members: [creatorId],
        pendingApprovals: [],
        isTemporary,
        expiresAt,
        timerPaused: false
      });
      await room.save();
      return {
        _id: room._id.toString(),
        code: room.code,
        name: room.name,
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        isPrivate: room.isPrivate,
        joinPolicy: room.joinPolicy,
        members: room.members,
        pendingApprovals: room.pendingApprovals,
        createdAt: room.createdAt,
        isTemporary: room.isTemporary,
        expiresAt: room.expiresAt,
        timerPaused: room.timerPaused,
      };
    } else {
      const newRoom = {
        _id: crypto.randomUUID(),
        code,
        name,
        creatorId,
        creatorName,
        isPrivate,
        joinPolicy,
        members: [creatorId],
        pendingApprovals: [],
        createdAt: new Date(),
        isTemporary,
        expiresAt,
        timerPaused: false
      };
      mockRooms.push(newRoom);
      return newRoom;
    }
  },

  async findRoomByCode(code: string) {
    if (!isMockDatabase) {
      const room = await RoomModel.findOne({ code });
      if (!room) return null;
      return {
        _id: room._id.toString(),
        code: room.code,
        name: room.name,
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        isPrivate: room.isPrivate || false,
        joinPolicy: room.joinPolicy || "direct",
        members: room.members || [room.creatorId],
        pendingApprovals: room.pendingApprovals || [],
        createdAt: room.createdAt,
        isTemporary: room.isTemporary || false,
        expiresAt: room.expiresAt,
        timerPaused: room.timerPaused || false,
      };
    } else {
      const room = mockRooms.find((r) => r.code === code);
      if (!room) return null;
      return {
        ...room,
        isPrivate: room.isPrivate || false,
        joinPolicy: room.joinPolicy || "direct",
        members: room.members || [room.creatorId],
        pendingApprovals: room.pendingApprovals || [],
        isTemporary: room.isTemporary || false,
        timerPaused: room.timerPaused || false,
      };
    }
  },

  async findRoomById(id: string) {
    if (!isMockDatabase) {
      const room = await RoomModel.findById(id);
      if (!room) return null;
      return {
        _id: room._id.toString(),
        code: room.code,
        name: room.name,
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        isPrivate: room.isPrivate || false,
        joinPolicy: room.joinPolicy || "direct",
        members: room.members || [room.creatorId],
        pendingApprovals: room.pendingApprovals || [],
        createdAt: room.createdAt,
        isTemporary: room.isTemporary || false,
        expiresAt: room.expiresAt,
        timerPaused: room.timerPaused || false,
      };
    } else {
      const room = mockRooms.find((r) => r._id === id);
      if (!room) return null;
      return {
        ...room,
        isPrivate: room.isPrivate || false,
        joinPolicy: room.joinPolicy || "direct",
        members: room.members || [room.creatorId],
        pendingApprovals: room.pendingApprovals || [],
        isTemporary: room.isTemporary || false,
        timerPaused: room.timerPaused || false,
      };
    }
  },

  async getAllRooms(userId?: string) {
    if (!isMockDatabase) {
      // Find rooms: either public (isPrivate is not true) or private owned by the current user
      const query: any = {
        $or: [
          { isPrivate: { $ne: true } },
        ]
      };
      if (userId) {
        query.$or.push({ isPrivate: true, creatorId: userId });
      }

      const rooms = await RoomModel.find(query).sort({ createdAt: -1 });
      return rooms.map((room) => ({
        _id: room._id.toString(),
        code: room.code,
        name: room.name,
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        isPrivate: room.isPrivate || false,
        joinPolicy: room.joinPolicy || "direct",
        members: room.members || [room.creatorId],
        pendingApprovals: room.pendingApprovals || [],
        createdAt: room.createdAt,
        isTemporary: room.isTemporary || false,
        expiresAt: room.expiresAt,
        timerPaused: room.timerPaused || false,
      }));
    } else {
      const rooms = mockRooms.filter((r) => {
        const isPrivate = r.isPrivate === true;
        if (!isPrivate) return true;
        return userId ? r.creatorId === userId : false;
      });
      return [...rooms].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  },

  async requestToJoinRoom(code: string, userId: string, username: string): Promise<{ success: boolean; status: "approved" | "pending" | "already_member" }> {
    if (!isMockDatabase) {
      const room = await RoomModel.findOne({ code });
      if (!room) return { success: false, status: "pending" };

      const members = room.members || [room.creatorId];
      if (members.includes(userId) || room.creatorId === userId) {
        return { success: true, status: "already_member" };
      }

      // Otherwise, add to pending approvals
      const pending = room.pendingApprovals || [];
      const alreadyPending = pending.some((p) => p.userId === userId);
      if (!alreadyPending) {
        await RoomModel.updateOne(
          { _id: room._id },
          { $push: { pendingApprovals: { userId, username } } }
        );
      }
      return { success: true, status: "pending" };
    } else {
      const roomIdx = mockRooms.findIndex((r) => r.code === code);
      if (roomIdx === -1) return { success: false, status: "pending" };
      const room = mockRooms[roomIdx];

      const members = room.members || [room.creatorId];
      if (members.includes(userId) || room.creatorId === userId) {
        return { success: true, status: "already_member" };
      }

      if (!room.pendingApprovals) room.pendingApprovals = [];
      const alreadyPending = room.pendingApprovals.some((p: any) => p.userId === userId);
      if (!alreadyPending) {
        room.pendingApprovals.push({ userId, username });
      }
      return { success: true, status: "pending" };
    }
  },

  async approveJoinRequest(code: string, userId: string, ownerId: string): Promise<boolean> {
    if (!isMockDatabase) {
      const room = await RoomModel.findOne({ code });
      if (!room || room.creatorId !== ownerId) return false;

      await RoomModel.updateOne(
        { _id: room._id },
        {
          $pull: { pendingApprovals: { userId } },
          $addToSet: { members: userId }
        }
      );
      return true;
    } else {
      const roomIdx = mockRooms.findIndex((r) => r.code === code);
      if (roomIdx === -1) return false;
      const room = mockRooms[roomIdx];
      if (room.creatorId !== ownerId) return false;

      if (room.pendingApprovals) {
        room.pendingApprovals = room.pendingApprovals.filter((p: any) => p.userId !== userId);
      }
      if (!room.members) room.members = [room.creatorId];
      if (!room.members.includes(userId)) {
        room.members.push(userId);
      }
      return true;
    }
  },

  async rejectJoinRequest(code: string, userId: string, ownerId: string): Promise<boolean> {
    if (!isMockDatabase) {
      const room = await RoomModel.findOne({ code });
      if (!room || room.creatorId !== ownerId) return false;

      await RoomModel.updateOne(
        { _id: room._id },
        {
          $pull: { pendingApprovals: { userId } }
        }
      );
      return true;
    } else {
      const roomIdx = mockRooms.findIndex((r) => r.code === code);
      if (roomIdx === -1) return false;
      const room = mockRooms[roomIdx];
      if (room.creatorId !== ownerId) return false;

      if (room.pendingApprovals) {
        room.pendingApprovals = room.pendingApprovals.filter((p: any) => p.userId !== userId);
      }
      return true;
    }
  },

  // --- MESSAGES ---
  async saveMessage(roomId: string, userId: string, username: string, text: string, fileId?: string) {
    if (!isMockDatabase) {
      const msg = new MessageModel({ roomId, userId, username, text, fileId });
      await msg.save();
      const populatedMsg: any = {
        _id: msg._id.toString(),
        roomId: msg.roomId,
        userId: msg.userId,
        username: msg.username,
        text: msg.text,
        createdAt: msg.createdAt,
        fileId: msg.fileId,
      };
      if (msg.fileId) {
        populatedMsg.file = await this.findFileById(msg.fileId);
      }
      return populatedMsg;
    } else {
      const newMsg = {
        _id: crypto.randomUUID(),
        roomId,
        userId,
        username,
        text,
        createdAt: new Date(),
        fileId,
      };
      mockMessages.push(newMsg);
      const populatedMsg: any = { ...newMsg };
      if (fileId) {
        populatedMsg.file = await this.findFileById(fileId);
      }
      return populatedMsg;
    }
  },

  async getRoomMessages(roomId: string) {
    if (!isMockDatabase) {
      const messages = await MessageModel.find({ roomId }).sort({ createdAt: 1 });
      const results: any[] = [];
      for (const m of messages) {
        const item: any = {
          _id: m._id.toString(),
          roomId: m.roomId,
          userId: m.userId,
          username: m.username,
          text: m.text,
          createdAt: m.createdAt,
          fileId: m.fileId,
        };
        if (m.fileId) {
          item.file = await this.findFileById(m.fileId);
        }
        results.push(item);
      }
      return results;
    } else {
      const messages = mockMessages.filter((m) => m.roomId === roomId);
      const results: any[] = [];
      for (const m of messages) {
        const item = { ...m };
        if (m.fileId) {
          item.file = await this.findFileById(m.fileId);
        }
        results.push(item);
      }
      return results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
  },

  // --- FILES ---
  async saveFile(fileData: {
    originalname: string;
    mimetype: string;
    size: number;
    uploaderId: string;
    uploaderName: string;
    passwordHash?: string;
    buffer: Buffer;
  }) {
    const filename = crypto.randomUUID() + "-" + fileData.originalname;
    
    if (!isMockDatabase) {
      // Create record in File collection
      const fileRecord = new FileModel({
        filename,
        originalname: fileData.originalname,
        size: fileData.size,
        mimetype: fileData.mimetype,
        uploaderId: fileData.uploaderId,
        uploaderName: fileData.uploaderName,
        passwordHash: fileData.passwordHash,
        dataBuffer: fileData.buffer, // Mongoose schema carries Buffer
      });
      await fileRecord.save();
      
      return {
        _id: fileRecord._id.toString(),
        filename: fileRecord.filename,
        originalname: fileRecord.originalname,
        size: fileRecord.size,
        mimetype: fileRecord.mimetype,
        uploaderId: fileRecord.uploaderId,
        uploaderName: fileRecord.uploaderName,
        hasPassword: !!fileData.passwordHash,
        uploadTime: fileRecord.uploadTime,
      };
    } else {
      const fileId = crypto.randomUUID();
      const newFile = {
        _id: fileId,
        filename,
        originalname: fileData.originalname,
        size: fileData.size,
        mimetype: fileData.mimetype,
        uploaderId: fileData.uploaderId,
        uploaderName: fileData.uploaderName,
        passwordHash: fileData.passwordHash,
        hasPassword: !!fileData.passwordHash,
        uploadTime: new Date(),
      };
      mockFiles.push(newFile);
      mockFileBuffers.set(fileId, fileData.buffer);
      
      return {
        _id: newFile._id,
        filename: newFile.filename,
        originalname: newFile.originalname,
        size: newFile.size,
        mimetype: newFile.mimetype,
        uploaderId: newFile.uploaderId,
        uploaderName: newFile.uploaderName,
        hasPassword: newFile.hasPassword,
        uploadTime: newFile.uploadTime,
      };
    }
  },

  async findFileById(id: string) {
    if (!isMockDatabase) {
      try {
        const file = await FileModel.findById(id).select("-dataBuffer");
        if (!file) return null;
        return {
          _id: file._id.toString(),
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          uploaderId: file.uploaderId,
          uploaderName: file.uploaderName,
          hasPassword: !!file.passwordHash,
          passwordHash: file.passwordHash,
          uploadTime: file.uploadTime,
        };
      } catch {
        return null;
      }
    } else {
      const file = mockFiles.find((f) => f._id === id);
      if (!file) return null;
      return {
        _id: file._id,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        uploaderId: file.uploaderId,
        uploaderName: file.uploaderName,
        hasPassword: file.hasPassword,
        passwordHash: file.passwordHash,
        uploadTime: file.uploadTime,
      };
    }
  },

  async getFileBuffer(id: string): Promise<Buffer | null> {
    if (!isMockDatabase) {
      const file = await FileModel.findById(id).select("dataBuffer");
      return file?.dataBuffer || null;
    } else {
      return mockFileBuffers.get(id) || null;
    }
  },

  async getRoomFiles(roomId: string) {
    // Files are associated with a room via messages in that room that have fileId
    const messages = await this.getRoomMessages(roomId);
    const files: any[] = [];
    const seen = new Set<string>();
    
    for (const msg of messages) {
      if (msg.fileId && !seen.has(msg.fileId)) {
        seen.add(msg.fileId);
        if (msg.file) {
          files.push(msg.file);
        }
      }
    }
    return files;
  },

  async deleteMessage(messageId: string, userId: string): Promise<{ success: boolean; roomId?: string; fileId?: string }> {
    if (!isMockDatabase) {
      try {
        const msg = await MessageModel.findById(messageId);
        if (!msg) return { success: false };
        
        // Strict check: only message sender can delete their message
        const isMsgOwner = msg.userId === userId;

        if (isMsgOwner) {
          const roomId = msg.roomId;
          const fileId = msg.fileId;
          // If message contains a file, delete that file from database too
          if (fileId) {
            await FileModel.deleteOne({ _id: fileId });
          }
          await MessageModel.deleteOne({ _id: messageId });
          return { success: true, roomId, fileId };
        }
        return { success: false };
      } catch (err) {
        console.error("Error deleting message:", err);
        return { success: false };
      }
    } else {
      const idx = mockMessages.findIndex((m) => m._id === messageId);
      if (idx === -1) return { success: false };
      const msg = mockMessages[idx];
      const isMsgOwner = msg.userId === userId;

      if (isMsgOwner) {
        const roomId = msg.roomId;
        const fileId = msg.fileId;
        // If message has file, delete from mock db too
        if (fileId) {
          const fIdx = mockFiles.findIndex((f) => f._id === fileId);
          if (fIdx !== -1) mockFiles.splice(fIdx, 1);
          mockFileBuffers.delete(fileId);
        }
        mockMessages.splice(idx, 1);
        return { success: true, roomId, fileId };
      }
      return { success: false };
    }
  },

  async deleteFile(fileId: string, userId: string): Promise<{ success: boolean; roomId?: string; messageId?: string }> {
    if (!isMockDatabase) {
      try {
        const file = await FileModel.findById(fileId);
        if (!file) return { success: false };

        // Strict check: only the uploader can delete their file
        const isAuthorized = file.uploaderId === userId;

        if (isAuthorized) {
          // Find a message referencing this file to get the roomId and messageId
          const message = await MessageModel.findOne({ fileId });
          const roomId = message ? message.roomId : undefined;
          const messageId = message ? message._id.toString() : undefined;

          await FileModel.deleteOne({ _id: fileId });
          // Delete referencing message from database
          await MessageModel.deleteMany({ fileId });
          return { success: true, roomId, messageId };
        }
        return { success: false };
      } catch (err) {
        console.error("Error deleting file:", err);
        return { success: false };
      }
    } else {
      const idx = mockFiles.findIndex((f) => f._id === fileId);
      if (idx === -1) return { success: false };
      const file = mockFiles[idx];

      const isAuthorized = file.uploaderId === userId;

      if (isAuthorized) {
        // Find a message referencing this file to get the roomId and messageId
        const message = mockMessages.find((m) => m.fileId === fileId);
        const roomId = message ? message.roomId : undefined;
        const messageId = message ? message._id : undefined;

        mockFiles.splice(idx, 1);
        mockFileBuffers.delete(fileId);

        // Delete referencing messages from mock database
        for (let i = mockMessages.length - 1; i >= 0; i--) {
          if (mockMessages[i].fileId === fileId) {
            mockMessages.splice(i, 1);
          }
        }
        return { success: true, roomId, messageId };
      }
      return { success: false };
    }
  },

  async updateRoomTimer(code: string, action: "stop" | "extend"): Promise<{ success: boolean; room?: any }> {
    if (!isMockDatabase) {
      const room = await RoomModel.findOne({ code });
      if (!room) return { success: false };

      if (action === "stop") {
        room.timerPaused = true;
      } else if (action === "extend") {
        room.timerPaused = false;
        const currentExpires = room.expiresAt && room.expiresAt.getTime() > Date.now() ? room.expiresAt.getTime() : Date.now();
        room.expiresAt = new Date(currentExpires + 24 * 60 * 60 * 1000);
      }
      await room.save();
      return {
        success: true,
        room: {
          _id: room._id.toString(),
          code: room.code,
          name: room.name,
          creatorId: room.creatorId,
          creatorName: room.creatorName,
          isPrivate: room.isPrivate || false,
          joinPolicy: room.joinPolicy || "direct",
          members: room.members,
          pendingApprovals: room.pendingApprovals,
          createdAt: room.createdAt,
          isTemporary: room.isTemporary || false,
          expiresAt: room.expiresAt,
          timerPaused: room.timerPaused || false,
        }
      };
    } else {
      const room = mockRooms.find((r) => r.code === code);
      if (!room) return { success: false };

      if (action === "stop") {
        room.timerPaused = true;
      } else if (action === "extend") {
        room.timerPaused = false;
        const currentExpires = room.expiresAt && room.expiresAt.getTime() > Date.now() ? room.expiresAt.getTime() : Date.now();
        room.expiresAt = new Date(currentExpires + 24 * 60 * 60 * 1000);
      }
      return { success: true, room };
    }
  },

  async getExpiredRooms(): Promise<any[]> {
    if (!isMockDatabase) {
      const now = new Date();
      const rooms = await RoomModel.find({
        isTemporary: true,
        timerPaused: false,
        expiresAt: { $lte: now }
      });
      return rooms.map((room) => ({
        _id: room._id.toString(),
        code: room.code,
        creatorId: room.creatorId,
      }));
    } else {
      const now = new Date();
      return mockRooms
        .filter((r) => r.isTemporary && !r.timerPaused && r.expiresAt && r.expiresAt.getTime() <= now.getTime())
        .map((r) => ({
          _id: r._id,
          code: r.code,
          creatorId: r.creatorId,
        }));
    }
  },

  async deleteRoom(code: string, userId: string): Promise<boolean> {
    if (!isMockDatabase) {
      try {
        const room = await RoomModel.findOne({ code });
        if (!room) return false;

        // Only the creator can delete the room
        if (room.creatorId !== userId) return false;

        // Find all messages in this room
        const messages = await MessageModel.find({ roomId: room._id.toString() });
        const fileIds = messages.map((m) => m.fileId).filter(Boolean) as string[];

        // Delete all associated files from DB
        if (fileIds.length > 0) {
          await FileModel.deleteMany({ _id: { $in: fileIds } });
        }

        // Delete all messages
        await MessageModel.deleteMany({ roomId: room._id.toString() });

        // Delete the room document
        await RoomModel.deleteOne({ _id: room._id });

        return true;
      } catch (err) {
        console.error("Error deleting room:", err);
        return false;
      }
    } else {
      const roomIdx = mockRooms.findIndex((r) => r.code === code);
      if (roomIdx === -1) return false;
      const room = mockRooms[roomIdx];

      if (room.creatorId !== userId) return false;

      // Find messages to delete
      const msgsToDelete = mockMessages.filter((m) => m.roomId === room._id);
      const fileIds = msgsToDelete.map((m) => m.fileId).filter(Boolean) as string[];

      // Delete mock files and buffers
      for (const fid of fileIds) {
        const fIdx = mockFiles.findIndex((f) => f._id === fid);
        if (fIdx !== -1) mockFiles.splice(fIdx, 1);
        mockFileBuffers.delete(fid);
      }

      // Delete mock messages
      for (let i = mockMessages.length - 1; i >= 0; i--) {
        if (mockMessages[i].roomId === room._id) {
          mockMessages.splice(i, 1);
        }
      }

      // Delete the mock room
      mockRooms.splice(roomIdx, 1);
      return true;
    }
  }
};
