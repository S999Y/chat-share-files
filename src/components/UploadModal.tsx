import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { X, Upload, Lock, ShieldAlert, Sparkles, AlertCircle } from "lucide-react";

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: (fileMeta: any) => void;
}

export default function UploadModal({ onClose, onUploadSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maximum file size config states (default to 10MB in bytes if not available)
  const [maxSizeBytes, setMaxSizeBytes] = useState<number>(10485760);
  const [maxSizeFormatted, setMaxSizeFormatted] = useState<string>("10 MB");

  useEffect(() => {
    axios.get("/api/status")
      .then(res => {
        if (res.data && typeof res.data.maxFileSize === "number") {
          setMaxSizeBytes(res.data.maxFileSize);
          setMaxSizeFormatted(res.data.maxFileSizeFormatted || `${(res.data.maxFileSize / (1024 * 1024)).toFixed(0)} MB`);
        }
      })
      .catch(err => {
        console.error("Failed to fetch size limits, using default", err);
      });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.size > maxSizeBytes) {
      setError(`File is too large. Max size allowed is ${maxSizeFormatted}. Current file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB.`);
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    if (password.trim()) {
      formData.append("password", password);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("/api/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      onUploadSuccess(response.data);
      onClose();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.response?.data?.error || "Upload failed. Please check the file size and try again.");
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-indigo-400" /> Share a File
        </h3>

        <form onSubmit={handleUpload} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              file 
                ? "border-emerald-500/40 bg-emerald-500/5" 
                : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            
            <Upload className={`h-8 w-8 mx-auto mb-2 ${file ? "text-emerald-400" : "text-slate-500"}`} />
            
            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-300 break-all">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-200">Drag & drop your file here, or click to browse</p>
                <p className="text-xs text-slate-500 mt-1">Supports files up to {maxSizeFormatted} (images, pdfs, documents, zips)</p>
              </div>
            )}
          </div>

          {/* Optional Password Protection */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <label className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-indigo-400" /> Password Protection (Optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for public download"
              className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
            />
            <p className="text-[10px] text-slate-500">
              If enabled, members must input the password to download or preview this file.
            </p>
          </div>

          {/* Progress Bar */}
          {uploadProgress !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-indigo-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit / Cancel Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploadProgress !== null}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 font-semibold hover:bg-slate-800 hover:text-white transition-all text-sm disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploadProgress !== null}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
