import { Router } from "express";
import { uploadFile, getFileMetadata, verifyFilePassword, downloadFile, deleteFileController } from "../controllers/fileController.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// Downloading doesn't require general requireAuth because we want direct downloads 
// and handle file-specific password verification within the controller itself. 
// Standard previews or downloads can pass the password as a query or verify first.
router.get("/:id/download", downloadFile as any);

// Other routes require authentication
router.post("/upload", requireAuth as any, upload.single("file"), uploadFile as any);
router.get("/:id/metadata", requireAuth as any, getFileMetadata as any);
router.post("/:id/verify", requireAuth as any, verifyFilePassword as any);
router.delete("/:id", requireAuth as any, deleteFileController as any);

export default router;
