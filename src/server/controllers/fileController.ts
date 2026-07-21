import { Response } from "express";
import bcrypt from "bcrypt";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { dbService } from "../services/dbService.js";

export async function uploadFile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const { password } = req.body;
    let passwordHash: string | undefined = undefined;

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const fileMeta = await dbService.saveFile({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploaderId: req.user.userId,
      uploaderName: req.user.username,
      passwordHash,
      buffer: req.file.buffer,
    });

    return res.status(201).json(fileMeta);
  } catch (err: any) {
    console.error("Upload File Error:", err);
    return res.status(500).json({ error: err.message || "Failed to upload file." });
  }
}

export async function getFileMetadata(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const file = await dbService.findFileById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found." });
    }

    // Exclude password hash from response
    const { passwordHash, ...safeFile } = file as any;

    return res.status(200).json(safeFile);
  } catch (err: any) {
    console.error("Get File Metadata Error:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve file metadata." });
  }
}

export async function verifyFilePassword(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const file = await dbService.findFileById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found." });
    }

    if (!file.hasPassword || !file.passwordHash) {
      return res.status(200).json({ success: true, message: "File is not password protected." });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required for verification." });
    }

    const match = await bcrypt.compare(password, file.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    return res.status(200).json({ success: true, message: "Password verified." });
  } catch (err: any) {
    console.error("Verify File Password Error:", err);
    return res.status(500).json({ error: err.message || "Failed to verify password." });
  }
}

export async function downloadFile(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    // Password can be passed via query string or headers
    const password = (req.query.password as string) || req.headers["x-file-password"] as string;

    const file = await dbService.findFileById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found." });
    }

    if (file.hasPassword && file.passwordHash) {
      if (!password) {
        return res.status(401).json({ error: "Password is required to access this file.", requiresPassword: true });
      }

      const match = await bcrypt.compare(password, file.passwordHash);
      if (!match) {
        return res.status(401).json({ error: "Incorrect password. Access denied.", requiresPassword: true });
      }
    }

    const buffer = await dbService.getFileBuffer(id);
    if (!buffer) {
      return res.status(404).json({ error: "File content not found." });
    }

    res.setHeader("Content-Type", file.mimetype);
    // Use content-disposition to trigger download or inline preview depending on mimetype
    // Standard previewable types (images, pdfs, audio, videos) can be served inline
    const inlineMimeTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "audio/mpeg", "video/mp4", "text/plain"];
    if (inlineMimeTypes.includes(file.mimetype) && !req.query.download) {
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalname)}"`);
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalname)}"`);
    }
    
    res.setHeader("Content-Length", buffer.length);
    return res.end(buffer);
  } catch (err: any) {
    console.error("Download File Error:", err);
    return res.status(500).json({ error: err.message || "Failed to download file." });
  }
}

export async function deleteFileController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const result = await dbService.deleteFile(id, req.user.userId);
    if (!result || !result.success) {
      return res.status(403).json({ error: "Failed to delete file. You may not have permission." });
    }

    // Broadcast file deletion in real-time over Socket.io so clients can update lists
    const io = req.app.get("io");
    if (io) {
      if (result.roomId) {
        io.to(result.roomId).emit("file-deleted", { fileId: id });
        if (result.messageId) {
          io.to(result.roomId).emit("message-deleted", { messageId: result.messageId });
        }
      } else {
        io.emit("file-deleted", { fileId: id });
        if (result.messageId) {
          io.emit("message-deleted", { messageId: result.messageId });
        }
      }
    }

    return res.status(200).json({ success: true, message: "File deleted successfully." });
  } catch (err: any) {
    console.error("Delete File Error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete file." });
  }
}
