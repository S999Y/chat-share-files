import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useSocket } from "../context/SocketContext.js";
import { apiClient } from "../api/client.js";
import UploadModal from "../components/UploadModal.js";
import FileCard from "../components/FileCard.js";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Users, 
  FileText, 
  Copy, 
  Check, 
  ArrowLeft, 
  Hash, 
  Clock, 
  User,
  ExternalLink,
  Shield,
  HelpCircle,
  AlertCircle,
  Trash2,
  X
} from "lucide-react";

export default function ChatRoom() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    socket,
    joinRoom, 
    leaveRoom, 
    sendMessage, 
    sendTyping, 
    messages, 
    onlineUsers, 
    typingUsers, 
    setRoomMessages 
  } = useSocket();

  const [room, setRoom] = useState<any>(null);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [confirmRoomName, setConfirmRoomName] = useState("");
  const [deleteRoomError, setDeleteRoomError] = useState<string | null>(null);
  const [deleteRoomLoading, setDeleteRoomLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Timer settings & states
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerAction, setTimerAction] = useState<"stop" | "extend" | null>(null);
  const [timerPassword, setTimerPassword] = useState("");
  const [timerError, setTimerError] = useState<string | null>(null);
  const [timerLoading, setTimerLoading] = useState(false);

  const openTimerActionModal = (action: "stop" | "extend") => {
    setTimerAction(action);
    setTimerPassword("");
    setTimerError(null);
    setShowTimerModal(true);
  };

  const handleTimerActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !timerAction || !timerPassword.trim()) return;

    setTimerLoading(true);
    setTimerError(null);
    try {
      const res = await apiClient.post(`/rooms/${room.code}/timer`, {
        action: timerAction,
        password: timerPassword
      });
      setRoom(res.data.room);
      showToast(res.data.message || "Timer updated successfully", "success");
      setShowTimerModal(false);
      setTimerPassword("");
      setTimerAction(null);
    } catch (err: any) {
      console.error("Timer action failed:", err);
      setTimerError(err.response?.data?.error || "Incorrect password. Verification failed.");
    } finally {
      setTimerLoading(false);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (!room || !room.isTemporary || room.timerPaused || !room.expiresAt) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const expires = new Date(room.expiresAt).getTime();
      const now = Date.now();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft("Expired (deleting...)");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(" "));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Common high quality emojis for easy clicking
  const commonEmojis = ["😀", "😂", "😍", "👍", "🔥", "🎉", "🚀", "💬", "🔒", "❤️", "👀", "🙌", "💯", "👏", "⚡"];

  // Fetch Room metadata, historical messages and files
  useEffect(() => {
    if (!code) return;

    const fetchRoomData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Fetch Room Details
        const roomRes = await apiClient.get(`/rooms/${code}`);
        const roomData = roomRes.data;
        setRoom(roomData);

        // 2. Fetch Historical Messages
        const msgRes = await apiClient.get(`/rooms/${code}/messages`);
        setRoomMessages(msgRes.data);

        // 3. Fetch Room Files
        const filesRes = await apiClient.get(`/rooms/${code}/files`);
        setFiles(filesRes.data);

      } catch (err: any) {
        console.error("Error loading room:", err);
        setError(err.response?.data?.error || "Failed to load room details. It may not exist.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [code]);

  // Handle Socket Join and Leave Room with fresh dependencies
  useEffect(() => {
    if (!room?._id || !user?._id) return;

    joinRoom(room._id, user._id, user.username);

    return () => {
      leaveRoom(room._id, user._id, user.username);
    };
  }, [room?._id, user?._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !room || !user) return;

    sendMessage(room._id, user._id, user.username, inputText);
    setInputText("");
    setShowEmojiPicker(false);

    // Stop typing immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTyping(room._id, user.username, false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!room || !user) return;

    // Trigger typing event
    sendTyping(room._id, user.username, true);

    // Clear previous timeout and start a new one to stop typing indicator after 2s of silence
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(room._id, user.username, false);
    }, 2000);
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleUploadSuccess = async (uploadedFile: any) => {
    if (!room || !user) return;

    // Automatically trigger a chat message with the uploaded file
    sendMessage(
      room._id, 
      user._id, 
      user.username, 
      `Shared a file: ${uploadedFile.originalname}`, 
      uploadedFile._id
    );

    // Refresh Room Files list
    try {
      const filesRes = await apiClient.get(`/rooms/${code}/files`);
      setFiles(filesRes.data);
    } catch (err) {
      console.error("Failed to refresh files:", err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await apiClient.delete(`/rooms/messages/${messageId}`);
      showToast("Message deleted successfully", "success");
    } catch (err: any) {
      console.error("Failed to delete message:", err);
      showToast(err.response?.data?.error || "Failed to delete message", "error");
    }
  };

  const handleApproveRequest = async (userIdToApprove: string) => {
    if (!code) return;
    try {
      await apiClient.post(`/rooms/${code}/approve`, { userId: userIdToApprove });
      const roomRes = await apiClient.get(`/rooms/${code}`);
      setRoom(roomRes.data);
    } catch (err: any) {
      console.error("Failed to approve request:", err);
    }
  };

  const handleRejectRequest = async (userIdToReject: string) => {
    if (!code) return;
    try {
      await apiClient.post(`/rooms/${code}/reject`, { userId: userIdToReject });
      const roomRes = await apiClient.get(`/rooms/${code}`);
      setRoom(roomRes.data);
    } catch (err: any) {
      console.error("Failed to reject request:", err);
    }
  };

  const handleDeleteRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    if (confirmRoomName !== room.name) return;

    setDeleteRoomLoading(true);
    setDeleteRoomError(null);
    try {
      await apiClient.delete(`/rooms/${room.code}`);
      setShowDeleteRoomModal(false);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Failed to delete room:", err);
      setDeleteRoomError(err.response?.data?.error || "Failed to delete room. You must be the owner.");
    } finally {
      setDeleteRoomLoading(false);
    }
  };

  // Real-time socket events for deletions and approvals
  useEffect(() => {
    if (!socket || !code) return;

    const handleRoomDeleted = (data: { roomCode: string }) => {
      if (data.roomCode === code) {
        navigate("/dashboard");
      }
    };

    const handleFileDeletedInRealtime = (data: { fileId: string }) => {
      setFiles((prev) => prev.filter((f) => f._id !== data.fileId));
      showToast("A file was deleted from this room", "info");
    };

    const handleMessageDeletedInRealtime = (data: { messageId: string }) => {
      showToast("A message was deleted from this room", "info");
    };

    const handleNewJoinRequest = (data: { roomCode: string; userId: string; username: string }) => {
      if (data.roomCode === code) {
        apiClient.get(`/rooms/${code}`)
          .then((res) => {
            setRoom(res.data);
            showToast(`New join request from ${data.username}`, "info");
          })
          .catch((err) => console.error("Error refreshing room after new join request:", err));
      }
    };

    const handleJoinRequestApproved = (data: { roomCode: string; userId: string }) => {
      if (data.roomCode === code) {
        apiClient.get(`/rooms/${code}`)
          .then((res) => {
            setRoom(res.data);
            showToast("A join request was approved", "info");
          })
          .catch((err) => console.error("Error refreshing room after approval event:", err));
      }
    };

    const handleJoinRequestRejected = (data: { roomCode: string; userId: string }) => {
      if (data.roomCode === code) {
        apiClient.get(`/rooms/${code}`)
          .then((res) => {
            setRoom(res.data);
            showToast("A join request was declined", "info");
          })
          .catch((err) => console.error("Error refreshing room after rejection event:", err));
      }
    };

    const handleRoomTimerUpdated = (updatedRoom: any) => {
      if (updatedRoom.code === code) {
        setRoom(updatedRoom);
        showToast("Room auto-deletion timer was updated!", "success");
      }
    };

    socket.on("room-deleted", handleRoomDeleted);
    socket.on("file-deleted", handleFileDeletedInRealtime);
    socket.on("message-deleted", handleMessageDeletedInRealtime);
    socket.on("new-join-request", handleNewJoinRequest);
    socket.on("join-request-approved", handleJoinRequestApproved);
    socket.on("join-request-rejected", handleJoinRequestRejected);
    socket.on("room-timer-updated", handleRoomTimerUpdated);

    return () => {
      socket.off("room-deleted", handleRoomDeleted);
      socket.off("file-deleted", handleFileDeletedInRealtime);
      socket.off("message-deleted", handleMessageDeletedInRealtime);
      socket.off("new-join-request", handleNewJoinRequest);
      socket.off("join-request-approved", handleJoinRequestApproved);
      socket.off("join-request-rejected", handleJoinRequestRejected);
      socket.off("room-timer-updated", handleRoomTimerUpdated);
    };
  }, [socket, code, navigate]);

  // Re-fetch files in room periodically or whenever messages update
  useEffect(() => {
    if (!code || !room) return;
    const refreshFiles = async () => {
      try {
        const filesRes = await apiClient.get(`/rooms/${code}/files`);
        setFiles(filesRes.data);
      } catch (err) {
        console.error("Failed to refresh files list:", err);
      }
    };
    refreshFiles();
  }, [messages.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans text-slate-400">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="text-sm">Connecting to secure chat room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans text-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center space-y-5">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">Access Denied / Not Found</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || "We could not find the requested chat room. It may have expired or the code is incorrect."}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 transition-all shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 font-sans text-slate-100 flex flex-col overflow-hidden">
      {/* Top Navigation / Room Info Header */}
      <nav className="border-b border-slate-850 bg-slate-900/40 backdrop-blur-md px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl transition-all"
            title="Leave room and return to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {room.name}
            </h2>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <span>Code: <strong className="text-slate-200 font-mono select-all">{room.code}</strong></span>
              <span>•</span>
              <span>Creator: <strong className="text-slate-300">{room.creatorName}</strong> ({room.isPrivate ? "Private" : "Public"})</span>
            </p>
          </div>
        </div>

        {/* Copy Invitation Code */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              copied 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-slate-900/40 border-slate-800 text-indigo-400 hover:text-indigo-300 hover:bg-slate-850"
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Code"}
          </button>

          {room && user && room.creatorId === user._id && (
            <button
              onClick={() => setShowDeleteRoomModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all"
              title="Delete this chatroom permanently"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete Room</span>
            </button>
          )}
        </div>
      </nav>

      {/* Expiration Timer Banner if temporary room */}
      {room && room.isTemporary && (
        <div className="bg-slate-900 border-b border-slate-850 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Temporary 24-Hour Room:</span>
            {room.timerPaused ? (
              <span className="text-rose-400 font-semibold bg-rose-400/10 px-2 py-0.5 rounded">Auto-deletion Stopped</span>
            ) : (
              <span className="text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1.5">
                Auto-deleting in <span className="font-mono bg-amber-400/20 px-1.5 py-0.5 rounded text-white">{timeLeft}</span>
              </span>
            )}
          </div>
          
          {user && room.creatorId === user._id && (
            <div className="flex items-center gap-2">
              {!room.timerPaused && (
                <button
                  onClick={() => openTimerActionModal("stop")}
                  className="px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition-all cursor-pointer"
                >
                  Stop Timer
                </button>
              )}
              <button
                onClick={() => openTimerActionModal("extend")}
                className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-medium transition-all cursor-pointer"
              >
                Extend 24h
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Container: Sidebar + Chat Stream */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Members & Files (hidden on small devices, expandable or standard) */}
        <aside className="hidden lg:flex w-80 shrink-0 border-r border-slate-850 bg-slate-900/20 flex-col overflow-hidden">
          
          {/* Pending Approvals Panel (only for Owner) */}
          {room && user && room.creatorId === user._id && room.pendingApprovals && room.pendingApprovals.length > 0 && (
            <div className="p-4 border-b border-slate-850 bg-amber-500/5 flex flex-col shrink-0">
              <h3 className="text-xs font-bold text-amber-400 tracking-wider uppercase mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Pending Requests ({room.pendingApprovals.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {room.pendingApprovals.map((req: any) => (
                  <div 
                    key={req.userId} 
                    className="p-2 rounded-xl bg-slate-900 border border-slate-850 flex flex-col gap-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded bg-amber-500/10 text-amber-400 border border-amber-500/10 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {req.username ? req.username[0] : "U"}
                      </div>
                      <span className="text-xs font-semibold text-white truncate">{req.username}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleApproveRequest(req.userId)}
                        className="flex-1 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.userId)}
                        className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold text-[10px] transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members Panel */}
          <div className="p-4 border-b border-slate-850/60 flex-1 flex flex-col overflow-hidden">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3 flex items-center gap-1.5 shrink-0">
              <Users className="h-3.5 w-3.5 text-indigo-400" /> Active Members ({onlineUsers.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {onlineUsers.map((u) => (
                <div 
                  key={u.socketId} 
                  className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-850/30 text-slate-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="h-7 w-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/10 flex items-center justify-center font-bold text-xs uppercase">
                        {u.username[0]}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-semibold text-white truncate">{u.username}</p>
                      {u.userId === user?._id && <p className="text-[10px] text-slate-500">You</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Files Panel */}
          <div className="p-4 border-t border-slate-850/60 flex-1 flex flex-col overflow-hidden bg-slate-900/10">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-400" /> Shared Files ({files.length})
              </span>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="text-[10px] text-indigo-400 hover:underline font-bold"
              >
                Upload
              </button>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {files.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <FileText className="h-8 w-8 mx-auto mb-1.5 opacity-40" />
                  <p className="text-xs">No files shared yet</p>
                </div>
              ) : (
                files.map((file) => (
                  <FileCard key={file._id} file={file} />
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Center / Chat Window */}
        <section className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          
          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            
            {/* Disclaimer banner for secure storage limits */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-center max-w-2xl mx-auto space-y-1">
              <p className="text-xs font-bold text-slate-200">🔒 Room Isolation Secured</p>
              <p className="text-[10px] text-slate-400">
                Only authenticated members with the room code can sync messages or view downloads.
              </p>
            </div>

            {/* Mobile-only Pending Approvals Panel (only for Owner) */}
            {room && user && room.creatorId === user._id && room.pendingApprovals && room.pendingApprovals.length > 0 && (
              <div className="lg:hidden rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 max-w-2xl mx-auto space-y-3 shadow-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Shield className="h-4 w-4" />
                  <span>Pending Join Requests ({room.pendingApprovals.length})</span>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {room.pendingApprovals.map((req: any) => (
                    <div key={req.userId} className="flex items-center justify-between bg-slate-900 border border-slate-850 p-2.5 rounded-xl text-xs gap-3">
                      <span className="font-semibold text-white truncate">{req.username}</span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveRequest(req.userId)}
                          className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-500 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.userId)}
                          className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 font-bold text-[10px] hover:bg-slate-750 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-12 space-y-2">
                <Smile className="h-10 w-10 text-slate-700" />
                <h4 className="text-sm font-semibold text-slate-400">Chat is silent</h4>
                <p className="text-xs max-w-xs mx-auto">Send a message or drop a file to start the conversation.</p>
              </div>
            ) : (
              messages.map((msg) => {
                // Render System join/leave message
                if (msg.isSystem) {
                  return (
                    <div key={msg._id} className="flex justify-center">
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-900/60 border border-slate-850 px-3 py-1 rounded-full text-center">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                const isMe = msg.userId === user?._id;

                return (
                  <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"}`}>
                      
                      {/* Name Header */}
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 px-1">
                        {!isMe && <span>{msg.username}</span>}
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        
                        {isMe && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            title="Delete message"
                            className="text-slate-500 hover:text-red-400 ml-1.5 p-0.5 rounded transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </span>

                      {/* Content Card */}
                      <div 
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe 
                            ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/10" 
                            : "bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-none"
                        }`}
                      >
                        {msg.text}

                        {/* If file message, render the FileCard attachment inside feed! */}
                        {msg.fileId && msg.file && (
                          <div className="mt-2.5 pt-2 border-t border-white/10">
                            <FileCard file={msg.file} inChatFeed={true} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator & Emoji list */}
          <div className="px-6 py-1 shrink-0">
            {typingUsers.length > 0 && (
              <div className="text-[10px] text-slate-400 font-medium italic animate-pulse flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-ping" />
                {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
              </div>
            )}
          </div>

          {/* Emoji Palette Overlay */}
          {showEmojiPicker && (
            <div className="mx-6 p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap gap-2 shrink-0 shadow-2xl relative z-10">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleAddEmoji(emoji)}
                  className="h-8 w-8 text-lg hover:bg-slate-800 rounded-lg flex items-center justify-center transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar Form */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-850 bg-slate-900/20 flex items-center gap-2 shrink-0">
            {/* File Clip Button */}
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              title="Attach a file"
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            {/* Emoji Trigger */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add Emoji"
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <Smile className="h-5 w-5" />
            </button>

            {/* Main Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={`Send a secure message to ${room.name}...`}
              className="flex-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-45 shadow-lg shadow-indigo-600/10"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </section>
      </div>

      {/* FILE SHARE MODAL */}
      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)} 
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {/* PASSWORD VERIFICATION FOR TIMER ACTIONS MODAL */}
      {showTimerModal && room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setShowTimerModal(false);
                setTimerPassword("");
                setTimerError(null);
                setTimerAction(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                Verify Room Ownership
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your account password to verify your identity and {timerAction === "stop" ? "stop" : "extend"} the 24-hour auto-deletion timer.
              </p>
            </div>

            {timerError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                {timerError}
              </div>
            )}

            <form onSubmit={handleTimerActionSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium block">
                  Your Account Password:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your account password"
                  value={timerPassword}
                  onChange={(e) => setTimerPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTimerModal(false);
                    setTimerPassword("");
                    setTimerError(null);
                    setTimerAction(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-850 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!timerPassword.trim() || timerLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
                    timerPassword.trim() && !timerLoading
                      ? "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/15"
                      : "bg-indigo-600/30 cursor-not-allowed text-slate-400 border border-indigo-950/20"
                  }`}
                >
                  {timerLoading ? "Verifying..." : "Confirm Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ROOM CONFIRMATION MODAL */}
      {showDeleteRoomModal && room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setShowDeleteRoomModal(false);
                setConfirmRoomName("");
                setDeleteRoomError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Chatroom Permanently?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will permanently delete the chatroom <strong className="text-slate-200">"{room.name}"</strong>, including all historical messages, chat logs, and all uploaded files from the database. This action is irreversible.
              </p>
            </div>

            {deleteRoomError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                {deleteRoomError}
              </div>
            )}

            <form onSubmit={handleDeleteRoomSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium block">
                  Please type the chatroom name <strong className="text-slate-200 select-all font-mono">"{room.name}"</strong> to confirm:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter chatroom name"
                  value={confirmRoomName}
                  onChange={(e) => setConfirmRoomName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteRoomModal(false);
                    setConfirmRoomName("");
                    setDeleteRoomError(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-850 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmRoomName !== room.name || deleteRoomLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
                    confirmRoomName === room.name && !deleteRoomLoading
                      ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/15"
                      : "bg-red-600/30 cursor-not-allowed text-slate-400 border border-red-950/20"
                  }`}
                >
                  {deleteRoomLoading ? "Deleting..." : "Delete Chatroom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Toast Notification Overlay */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-slate-900/95 backdrop-blur-md shadow-2xl animate-bounce-short text-xs font-semibold text-slate-100 max-w-sm border-slate-800">
          <div className={`h-2 w-2 rounded-full ${
            toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-red-500" : "bg-indigo-500"
          }`} />
          <span>{toast.message}</span>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 transition-colors focus:outline-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
