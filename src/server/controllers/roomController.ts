import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { dbService } from "../services/dbService.js";
import { comparePassword } from "../utils/authUtils.js";

export async function createRoom(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, isPrivate, joinPolicy, isTemporary } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Room name is required." });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const room = await dbService.createRoom(
      name,
      req.user.userId,
      req.user.username,
      isPrivate === true,
      joinPolicy || "direct",
      isTemporary === true
    );
    return res.status(201).json(room);
  } catch (err: any) {
    console.error("Create Room Error:", err);
    return res.status(500).json({ error: err.message || "Failed to create room." });
  }
}

export async function joinRoom(req: AuthenticatedRequest, res: Response) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Room code is required." });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const room = await dbService.findRoomByCode(code);
    if (!room) {
      return res.status(404).json({ error: "Room not found. Please check the code." });
    }

    const members = room.members || [room.creatorId];
    if (room.creatorId === req.user.userId || members.includes(req.user.userId)) {
      return res.status(200).json({ success: true, room });
    }

    const result = await dbService.requestToJoinRoom(code, req.user.userId, req.user.username);
    if (result.status === "approved" || result.status === "already_member") {
      const updatedRoom = await dbService.findRoomByCode(code);
      return res.status(200).json({ success: true, room: updatedRoom });
    }

    // Emit new join request to the room owner
    const io = req.app.get("io");
    if (io) {
      io.to(room._id.toString()).emit("new-join-request", { roomCode: code, userId: req.user.userId, username: req.user.username });
    }

    return res.status(200).json({
      success: false,
      status: "pending",
      error: "This room requires approval from the owner. Your request has been submitted."
    });
  } catch (err: any) {
    console.error("Join Room Error:", err);
    return res.status(500).json({ error: err.message || "Failed to join room." });
  }
}

export async function getRoomDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const { code } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const room = await dbService.findRoomByCode(code);
    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    const members = room.members || [room.creatorId];
    const isMember = room.creatorId === req.user.userId || members.includes(req.user.userId);

    if (!isMember) {
      // If it's a public room with direct join, auto-approve
      if (!room.isPrivate && room.joinPolicy === "direct") {
        await dbService.requestToJoinRoom(code, req.user.userId, req.user.username);
        const updatedRoom = await dbService.findRoomByCode(code);
        return res.status(200).json(updatedRoom);
      }

      return res.status(403).json({
        error: "Access denied. You are not a member of this room and require approval.",
        status: "pending"
      });
    }

    return res.status(200).json(room);
  } catch (err: any) {
    console.error("Get Room Details Error:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve room details." });
  }
}

export async function getRoomMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const { code } = req.params;
    const room = await dbService.findRoomByCode(code);
    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    const messages = await dbService.getRoomMessages(room._id);
    return res.status(200).json(messages);
  } catch (err: any) {
    console.error("Get Room Messages Error:", err);
    return res.status(500).json({ error: err.message || "Failed to get room messages." });
  }
}

export async function getRoomFiles(req: AuthenticatedRequest, res: Response) {
  try {
    const { code } = req.params;
    const room = await dbService.findRoomByCode(code);
    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    const files = await dbService.getRoomFiles(room._id);
    return res.status(200).json(files);
  } catch (err: any) {
    console.error("Get Room Files Error:", err);
    return res.status(500).json({ error: err.message || "Failed to get room files." });
  }
}

export async function getAllRooms(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const rooms = await dbService.getAllRooms(userId);
    return res.status(200).json(rooms);
  } catch (err: any) {
    console.error("Get All Rooms Error:", err);
    return res.status(500).json({ error: err.message || "Failed to list rooms." });
  }
}

export async function approveJoinRequestController(req: AuthenticatedRequest, res: Response) {
  try {
    const { code } = req.params;
    const { userId } = req.body;
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    if (!userId) {
      return res.status(400).json({ error: "User ID is required for approval." });
    }

    const room = await dbService.findRoomByCode(code);
    const success = await dbService.approveJoinRequest(code, userId, req.user.userId);
    if (!success) {
      return res.status(403).json({ error: "Failed to approve request. You must be the owner of this room." });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("join-request-approved", { roomCode: code, userId });
      if (room) {
        io.to(room._id.toString()).emit("join-request-approved", { roomCode: code, userId });
      }
    }

    return res.status(200).json({ success: true, message: "Request approved successfully." });
  } catch (err: any) {
    console.error("Approve Request Error:", err);
    return res.status(500).json({ error: err.message || "Failed to approve request." });
  }
}

export async function rejectJoinRequestController(req: AuthenticatedRequest, res: Response) {
  try {
    const { code } = req.params;
    const { userId } = req.body;
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    if (!userId) {
      return res.status(400).json({ error: "User ID is required for rejection." });
    }

    const room = await dbService.findRoomByCode(code);
    const success = await dbService.rejectJoinRequest(code, userId, req.user.userId);
    if (!success) {
      return res.status(403).json({ error: "Failed to reject request. You must be the owner of this room." });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("join-request-rejected", { roomCode: code, userId });
      if (room) {
        io.to(room._id.toString()).emit("join-request-rejected", { roomCode: code, userId });
      }
    }

    return res.status(200).json({ success: true, message: "Request rejected successfully." });
  } catch (err: any) {
    console.error("Reject Request Error:", err);
    return res.status(500).json({ error: err.message || "Failed to reject request." });
  }
}

export async function deleteMessageController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const result = await dbService.deleteMessage(id, req.user.userId);
    if (!result || !result.success) {
      return res.status(403).json({ error: "Failed to delete message. You may not have permission." });
    }

    // Broadcast the message deletion in real-time over Socket.io to the room
    const io = req.app.get("io");
    if (io) {
      if (result.roomId) {
        io.to(result.roomId).emit("message-deleted", { messageId: id });
        if (result.fileId) {
          io.to(result.roomId).emit("file-deleted", { fileId: result.fileId });
        }
      } else {
        io.emit("message-deleted", { messageId: id });
        if (result.fileId) {
          io.emit("file-deleted", { fileId: result.fileId });
        }
      }
    }

    return res.status(200).json({ success: true, message: "Message deleted successfully." });
  } catch (err: any) {
    console.error("Delete Message Error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete message." });
  }
}

export async function deleteRoomController(req: AuthenticatedRequest, res: Response) {
  try {
    const { code } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const success = await dbService.deleteRoom(code, req.user.userId);
    if (!success) {
      return res.status(403).json({ error: "Failed to delete room. You must be the owner of this room." });
    }

    // Broadcast room deletion in real-time over Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("room-deleted", { roomCode: code });
    }

    return res.status(200).json({ success: true, message: "Room deleted successfully." });
  } catch (err: any) {
    console.error("Delete Room Error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete room." });
  }
}

export async function updateRoomTimerController(req: AuthenticatedRequest, res: Response) {
  try {
    const { code } = req.params;
    const { action, password } = req.body;

    if (!action || !["stop", "extend"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be 'stop' or 'extend'." });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required to change timer settings." });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const room = await dbService.findRoomByCode(code);
    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    if (room.creatorId !== req.user.userId) {
      return res.status(403).json({ error: "Only the room owner can modify the timer." });
    }

    const user = await dbService.findUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: "Creator user account not found." });
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Incorrect password. Verification failed." });
    }

    const result = await dbService.updateRoomTimer(code, action);
    if (!result.success || !result.room) {
      return res.status(500).json({ error: "Failed to update room timer." });
    }

    // Emit live update to all sockets in the room
    const io = req.app.get("io");
    if (io) {
      io.to(code).emit("room-timer-updated", result.room);
    }

    return res.status(200).json({
      message: `Timer ${action === "stop" ? "paused/stopped" : "extended"} successfully.`,
      room: result.room
    });
  } catch (err: any) {
    console.error("Update Room Timer Error:", err);
    return res.status(500).json({ error: err.message || "Failed to update room timer." });
  }
}
