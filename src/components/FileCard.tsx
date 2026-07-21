import React, { useState } from "react";
import { 
  File, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive, 
  Download, 
  Eye, 
  Lock, 
  Unlock, 
  X,
  AlertCircle,
  Clock,
  User,
  Trash2
} from "lucide-react";
import { SharedFile } from "../types.js";
import { apiClient } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

interface FileCardProps {
  file: SharedFile;
  inChatFeed?: boolean;
}

export default function FileCard({ file, inChatFeed = false }: FileCardProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [promptAction, setPromptAction] = useState<"download" | "preview" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifiedPassword, setVerifiedPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Preview states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDeleteFile = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/files/${file._id}`);
    } catch (err: any) {
      console.error("Failed to delete file:", err);
      setError(err.response?.data?.error || "Failed to delete file.");
    } finally {
      setLoading(false);
    }
  };

  // Format file size
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Determine file icon
  const getFileIcon = (mime: string) => {
    if (mime.startsWith("image/")) return <Image className="h-5 w-5 text-emerald-400" />;
    if (mime.startsWith("video/")) return <Video className="h-5 w-5 text-indigo-400" />;
    if (mime.startsWith("audio/")) return <Music className="h-5 w-5 text-pink-400" />;
    if (mime.startsWith("text/") || mime === "application/pdf") return <FileText className="h-5 w-5 text-blue-400" />;
    if (mime.includes("zip") || mime.includes("tar") || mime.includes("compressed")) return <Archive className="h-5 w-5 text-amber-400" />;
    return <File className="h-5 w-5 text-slate-400" />;
  };

  const handleAction = (action: "download" | "preview") => {
    setError(null);
    if (file.hasPassword && !verifiedPassword) {
      setPromptAction(action);
      setShowPasswordPrompt(true);
    } else {
      if (action === "download") {
        triggerDownload(verifiedPassword || "");
      } else {
        triggerPreview(verifiedPassword || "");
      }
    }
  };

  const verifyPasswordAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Call verify endpoint
      const res = await apiClient.post(`/files/${file._id}/verify`, { password });
      if (res.data.success) {
        setVerifiedPassword(password);
        setShowPasswordPrompt(false);
        setPassword("");
        
        if (promptAction === "download") {
          triggerDownload(password);
        } else if (promptAction === "preview") {
          triggerPreview(password);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const triggerDownload = async (pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const passParam = pass ? `?password=${encodeURIComponent(pass)}` : "";
      // Use apiClient to fetch the file as a blob securely with JWT headers
      const response = await apiClient.get(`/files/${file._id}/download${passParam}`, {
        responseType: "blob",
        params: { download: "true" }
      });
      
      const blob = new Blob([response.data], { type: (response.headers["content-type"] as string) || file.mimetype });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.originalname;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Give a tiny timeout before revoking the object URL to let the browser initiate the download
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (err: any) {
      console.error("Download failed:", err);
      setError("Failed to download file. Please check your credentials or password.");
    } finally {
      setLoading(false);
    }
  };

  const triggerPreview = async (pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const passParam = pass ? `?password=${encodeURIComponent(pass)}` : "";
      // Fetch preview file securely with JWT headers
      const response = await apiClient.get(`/files/${file._id}/download${passParam}`, {
        responseType: "blob"
      });
      
      const blob = new Blob([response.data], { type: (response.headers["content-type"] as string) || file.mimetype });
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
      setShowPreviewModal(true);
    } catch (err: any) {
      console.error("Preview failed:", err);
      setError("Failed to load file preview.");
    } finally {
      setLoading(false);
    }
  };

  // Check if previewable
  const isPreviewable = (mime: string) => {
    const previewableTypes = [
      "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
      "video/mp4", "video/webm", "video/ogg",
      "audio/mpeg", "audio/ogg", "audio/wav",
      "application/pdf", "text/plain"
    ];
    return previewableTypes.includes(mime);
  };

  return (
    <div 
      className={`rounded-xl border transition-all ${
        inChatFeed 
          ? "bg-slate-900/60 border-slate-800 p-4 max-w-sm w-full" 
          : "bg-slate-950/40 border-slate-800 hover:border-slate-700/60 p-3.5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2.5 min-w-0">
          <div className="p-2 bg-slate-900 rounded-lg shrink-0 border border-slate-800/40">
            {getFileIcon(file.mimetype)}
          </div>
          <div className="min-w-0">
            <h5 className="text-sm font-semibold text-white truncate" title={file.originalname}>
              {file.originalname}
            </h5>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-400 text-[11px] mt-0.5">
              <span className="font-medium text-slate-300">{formatBytes(file.size)}</span>
              {file.hasPassword && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-400/5 border border-amber-400/10 px-1.5 py-0.2 rounded-md">
                  {verifiedPassword ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {verifiedPassword ? "Unlocked" : "Locked"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Button Bar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isPreviewable(file.mimetype) && (
            <button
              onClick={() => handleAction("preview")}
              title="Preview file"
              className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-800 rounded-lg transition-all"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handleAction("download")}
            title="Download file"
            className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-800 rounded-lg transition-all"
          >
            <Download className="h-4 w-4" />
          </button>
          {file.uploaderId === user?._id && (
            <button
              onClick={handleDeleteFile}
              disabled={loading}
              title="Delete file"
              className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-800 rounded-lg transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* File Uploader Info */}
      {inChatFeed && (
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-800/50 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 text-slate-500" />
            Uploaded by <strong className="text-slate-300">{file.uploaderName}</strong>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-500" />
            {new Date(file.uploadTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}

      {error && !showPasswordPrompt && (
        <div className="mt-2.5 pt-2 border-t border-red-950/40 text-[10px] text-red-400 font-semibold flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PASSWORD PROTECTION PROMPT MODAL */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" /> Password Required
              </h4>
              <button
                onClick={() => setShowPasswordPrompt(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              The file <strong className="text-slate-200">{file.originalname}</strong> is password protected. Enter password to continue.
            </p>

            <form onSubmit={verifyPasswordAndProceed} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordPrompt(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-850 text-slate-400 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-all shadow-md"
                >
                  {loading ? "Verifying..." : "Verify & Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INLINE MEDIA PREVIEW MODAL */}
      {showPreviewModal && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-6">
          <div className="w-full max-w-4xl h-[80vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl relative">
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(file.mimetype)}
                <h4 className="text-sm font-bold text-white truncate max-w-md sm:max-w-xl">
                  Preview: {file.originalname}
                </h4>
              </div>
              <button
                onClick={() => {
                  if (previewUrl && previewUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setShowPreviewModal(false);
                  setPreviewUrl(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-850 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Render preview depending on mime */}
            <div className="flex-1 overflow-auto bg-slate-950/40 p-4 flex items-center justify-center">
              {file.mimetype.startsWith("image/") && (
                <img
                  src={previewUrl}
                  alt={file.originalname}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-xl"
                />
              )}

              {file.mimetype.startsWith("video/") && (
                <video controls className="max-h-full max-w-full rounded-lg" src={previewUrl} />
              )}

              {file.mimetype.startsWith("audio/") && (
                <audio controls className="w-full max-w-md" src={previewUrl} />
              )}

              {file.mimetype === "application/pdf" && (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  className="w-full h-full rounded-lg border-0 bg-white"
                />
              )}

              {file.mimetype.startsWith("text/") && (
                <iframe
                  src={previewUrl}
                  title="Text Preview"
                  className="w-full h-full rounded-lg border-0 bg-slate-950 p-4 text-slate-100 font-mono text-xs whitespace-pre-wrap overflow-auto"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
