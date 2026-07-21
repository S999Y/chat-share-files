import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../api/client.js";
import { 
  Plus, 
  Users, 
  DoorOpen, 
  LogOut, 
  User as UserIcon, 
  Hash, 
  Calendar, 
  MessageSquare,
  Sparkles,
  Server,
  AlertCircle,
  Trash2,
  X,
  Lock,
  Unlock,
  Globe,
  ShieldAlert,
  CheckCircle2,
  Clock
} from "lucide-react";

export default function Dashboard() {
  const { user, logout, isMock } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [createRoomName, setCreateRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinPolicy, setJoinPolicy] = useState<"direct" | "approval">("direct");
  const [isTemporary, setIsTemporary] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<any>(null);
  const [confirmRoomName, setConfirmRoomName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch all rooms from the backend on load
  const fetchRooms = async () => {
    try {
      const res = await apiClient.get("/rooms/all");
      setRooms(res.data);
    } catch (err: any) {
      console.error("Failed to load rooms:", err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!createRoomName.trim()) return;

    setLoading(true);
    try {
      const res = await apiClient.post("/rooms/create", { 
        name: createRoomName,
        isPrivate,
        joinPolicy,
        isTemporary
      });
      setSuccess(`Room "${res.data.name}" created successfully! Code: ${res.data.code}`);
      setCreateRoomName("");
      setIsPrivate(false);
      setJoinPolicy("direct");
      setIsTemporary(false);
      fetchRooms();
      // Redirect to room
      setTimeout(() => navigate(`/room/${res.data.code}`), 1200);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create room.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!joinRoomCode.trim()) return;

    setLoading(true);
    try {
      const res = await apiClient.post("/rooms/join", { code: joinRoomCode });
      if (res.data.success === false && res.data.status === "pending") {
        setSuccess(res.data.error || "Approval required from room owner. Request has been sent!");
      } else {
        const roomData = res.data.room || res.data;
        setSuccess(`Joining room "${roomData.name}"...`);
        // Redirect to room
        setTimeout(() => navigate(`/room/${roomData.code}`), 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Room not found. Check the 6-character code.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomToDelete) return;
    if (confirmRoomName !== roomToDelete.name) return;

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/rooms/${roomToDelete.code}`);
      setShowDeleteModal(false);
      setRoomToDelete(null);
      setConfirmRoomName("");
      fetchRooms();
    } catch (err: any) {
      console.error("Failed to delete room:", err);
      setDeleteError(err.response?.data?.error || "Failed to delete room.");
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Header Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg">
            CS
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Chat & File Share
            </h1>
            {isMock && (
              <span className="text-[10px] text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded-md">
                SANDBOX
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/50 text-sm">
            <UserIcon className="h-4 w-4 text-slate-400" />
            <span className="text-slate-200 font-medium">{user?.username}</span>
          </div>

          <button
            onClick={() => navigate("/profile")}
            title="Profile details"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <UserIcon className="h-5 w-5" />
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome Block */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/30 p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="space-y-2 relative z-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              Hello, {user?.username} <Sparkles className="h-6 w-6 text-indigo-400" />
            </h2>
            <p className="text-slate-400 max-w-xl">
              Create a fresh chat room with a random 6-digit access code, or input a friend's room code to connect and share files instantly.
            </p>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-300 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-300 text-sm flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Action Panel: Create and Join Rooms */}
          <div className="space-y-8 lg:col-span-1">
            {/* Create Room Box */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-400" /> Create a Room
              </h3>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Room Name</label>
                  <input
                    type="text"
                    required
                    value={createRoomName}
                    onChange={(e) => setCreateRoomName(e.target.value)}
                    placeholder="Engineering Sync, Study Group..."
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* Public / Private Room Switch */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium block">Room Visibility</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPrivate(false);
                        setJoinPolicy("direct");
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        !isPrivate
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-sm"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                      }`}
                    >
                      <Globe className="h-4 w-4" />
                      <span>Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrivate(true)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        isPrivate
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-sm"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {!isPrivate 
                      ? "Public rooms are listed at the bottom of the dashboard for everyone." 
                      : "Private rooms are hidden from the dashboard, visible only to you."}
                  </p>
                </div>

                {/* Join Policy Options (Only for Private Rooms) */}
                {isPrivate && (
                  <div className="space-y-2 pt-1">
                    <label className="text-xs text-slate-400 font-medium block">Join Authorization</label>
                    <div className="space-y-2">
                      <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        joinPolicy === "direct"
                          ? "bg-slate-900 border-indigo-500/50"
                          : "bg-slate-950/40 border-slate-800/85 hover:border-slate-700"
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="joinPolicy"
                            checked={joinPolicy === "direct"}
                            onChange={() => setJoinPolicy("direct")}
                            className="text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
                          />
                          <div className="text-left">
                            <span className="block text-xs font-semibold text-white">Join with code</span>
                            <span className="block text-[10px] text-slate-500">Direct access if they enter correct code</span>
                          </div>
                        </div>
                      </label>

                      <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        joinPolicy === "approval"
                          ? "bg-slate-900 border-indigo-500/50"
                          : "bg-slate-950/40 border-slate-800/85 hover:border-slate-700"
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="joinPolicy"
                            checked={joinPolicy === "approval"}
                            onChange={() => setJoinPolicy("approval")}
                            className="text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
                          />
                          <div className="text-left">
                            <span className="block text-xs font-semibold text-white">Join with code after approval</span>
                            <span className="block text-[10px] text-slate-500">Owner must approve access requests</span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Temporary Room Switch */}
                <div className="space-y-2 pt-1.5 border-t border-slate-900">
                  <label className="text-xs text-slate-400 font-medium block">Room Expiration</label>
                  <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isTemporary
                      ? "bg-amber-400/10 border-amber-500/50 text-amber-400 shadow-sm"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="isTemporaryCheckbox"
                        checked={isTemporary}
                        onChange={(e) => setIsTemporary(e.target.checked)}
                        className="text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900 rounded"
                      />
                      <div className="text-left">
                        <span className="block text-xs font-semibold text-white">Temporary Room</span>
                        <span className="block text-[10px] text-slate-500">Auto-deletes after 24 hours</span>
                      </div>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  id="submitCreateRoom"
                  disabled={loading || !createRoomName.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create Room
                </button>
              </form>
            </div>

            {/* Join Room Box */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-indigo-400" /> Join Room via Code
              </h3>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">6-Character Room Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                    placeholder="X3Y7A2"
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center tracking-widest font-mono text-lg text-white placeholder-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || joinRoomCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
              </form>
            </div>
          </div>

          {/* Rooms List Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                <Users className="h-5 w-5 text-indigo-400" /> Active Platform Rooms
              </h3>
              <button
                onClick={fetchRooms}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition-all"
              >
                Refresh List
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 border-dashed bg-slate-900/10 p-12 text-center space-y-3">
                <MessageSquare className="h-10 w-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-300">No rooms active on the platform</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Be the first to create a chat room! Other users can instantly join using your room's custom 6-digit code.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <div
                    key={room._id}
                    className="group rounded-2xl border border-slate-800 hover:border-slate-700 bg-slate-900/10 hover:bg-slate-900/30 p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-400 bg-indigo-400/10 px-2.5 py-0.5 rounded-full">
                            <Hash className="h-3 w-3" /> {room.code}
                          </span>
                          {room.isPrivate ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full" title={room.joinPolicy === "approval" ? "Private Room (Requires Approval)" : "Private Room"}>
                              <Lock className="h-2.5 w-2.5" /> Private
                              {room.joinPolicy === "approval" && <span className="text-[8px] bg-rose-500/20 text-rose-300 px-1 rounded">Approval</span>}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                              <Globe className="h-2.5 w-2.5" /> Public
                            </span>
                          )}
                          {room.isTemporary && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                              <Clock className="h-2.5 w-2.5" /> Temp
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(room.createdAt).toLocaleDateString()}
                          </span>
                          {room.creatorId === user?._id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRoomToDelete(room);
                                setShowDeleteModal(true);
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800 transition-all"
                              title="Delete room"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {room.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 text-xs">
                      <span className="text-slate-400">
                        Creator: <strong className="text-slate-300">{room.creatorName}</strong> ({room.isPrivate ? "Private" : "Public"})
                      </span>
                      <button
                        onClick={() => navigate(`/room/${room.code}`)}
                        className="font-bold text-indigo-400 group-hover:text-indigo-300 hover:underline flex items-center gap-0.5"
                      >
                        Enter Room &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* DELETE ROOM CONFIRMATION MODAL */}
      {showDeleteModal && roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setRoomToDelete(null);
                setConfirmRoomName("");
                setDeleteError(null);
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
                This will permanently delete the chatroom <strong className="text-slate-200">"{roomToDelete.name}"</strong>, including all historical messages, chat logs, and all uploaded files from the database. This action is irreversible.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteRoomSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium block">
                  Please type the chatroom name <strong className="text-slate-200 select-all font-mono">"{roomToDelete.name}"</strong> to confirm:
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
                    setShowDeleteModal(false);
                    setRoomToDelete(null);
                    setConfirmRoomName("");
                    setDeleteError(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-850 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmRoomName !== roomToDelete.name || deleteLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
                    confirmRoomName === roomToDelete.name && !deleteLoading
                      ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/15"
                      : "bg-red-600/30 cursor-not-allowed text-slate-400 border border-red-950/20"
                  }`}
                >
                  {deleteLoading ? "Deleting..." : "Delete Chatroom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
