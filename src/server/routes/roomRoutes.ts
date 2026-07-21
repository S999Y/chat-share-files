import { Router } from "express";
import {
  createRoom,
  joinRoom,
  getRoomDetails,
  getRoomMessages,
  getRoomFiles,
  getAllRooms,
  deleteMessageController,
  deleteRoomController,
  approveJoinRequestController,
  rejectJoinRequestController,
  updateRoomTimerController
} from "../controllers/roomController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Secure all room routes
router.use(requireAuth as any);

router.post("/create", createRoom as any);
router.post("/join", joinRoom as any);
router.get("/all", getAllRooms as any);
router.post("/:code/approve", approveJoinRequestController as any);
router.post("/:code/reject", rejectJoinRequestController as any);
router.post("/:code/timer", updateRoomTimerController as any);
router.get("/:code", getRoomDetails as any);
router.get("/:code/messages", getRoomMessages as any);
router.get("/:code/files", getRoomFiles as any);
router.delete("/messages/:id", deleteMessageController as any);
router.delete("/:code", deleteRoomController as any);

export default router;
