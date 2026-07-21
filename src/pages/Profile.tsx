import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Server, 
  ShieldCheck, 
  Lock,
  ExternalLink
} from "lucide-react";

export default function Profile() {
  const { user, isMock, dbError } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Top Header */}
      <nav className="border-b border-slate-850 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <h1 className="text-sm font-bold text-white uppercase tracking-wider">
          User Profile
        </h1>
        <div className="w-20" /> {/* Spacer */}
      </nav>

      {/* Profile Body */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-850 bg-slate-900/40 backdrop-blur-md p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 border-b border-slate-800/80 pb-6">
            <div className="h-20 w-20 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/15 flex items-center justify-center font-bold text-3xl uppercase shrink-0">
              {user?.username ? user.username[0] : "U"}
            </div>
            <div className="text-center sm:text-left space-y-1 min-w-0">
              <h2 className="text-2xl font-black text-white truncate">
                {user?.username}
              </h2>
              <p className="text-sm text-slate-400 truncate flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-4 w-4 text-slate-500" /> {user?.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-950/40 border border-slate-850/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-semibold uppercase tracking-wide block">Account Created</span>
              <span className="text-slate-200 font-medium flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
              </span>
            </div>
            
            <div className="p-4 bg-slate-950/40 border border-slate-850/60 rounded-xl space-y-1">
              <span className="text-slate-500 font-semibold uppercase tracking-wide block">Session Protection</span>
              <span className="text-slate-200 font-medium flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                JWT Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* Cloud Persistence Connection Details */}
        <div className="rounded-2xl border border-slate-850 bg-slate-900/20 p-6 sm:p-8 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-indigo-400" /> Server Connection Metadata
          </h3>

          {isMock ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-200 text-xs flex items-start gap-3">
                <Server className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Running on Local Sandbox Storage</p>
                  <p className="mt-1 text-slate-400 leading-relaxed">
                    The backend database is running in mock in-memory mode because no <code className="text-amber-300 font-mono">MONGODB_URI</code> environment variable is declared. All rooms, messages, and uploaded file buffers are saved directly in server RAM.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 rounded-xl text-xs space-y-2.5">
                <p className="font-semibold text-slate-300">How to configure permanent storage:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
                  <li>Create a free cluster on <a href="https://mongodb.com/atlas" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">MongoDB Atlas</a>.</li>
                  <li>Copy your connection string URI (e.g. <code className="text-indigo-300">mongodb+srv://...</code>).</li>
                  <li>Open the **Secrets/Variables** panel in the Google AI Studio build UI.</li>
                  <li>Add an environment variable named <code className="text-indigo-300">MONGODB_URI</code> with your copied connection string.</li>
                  <li>The applet dev server will automatically restart and connect securely!</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-300 text-xs flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">MongoDB Atlas Fully Connected</p>
                  <p className="mt-1 text-slate-400 leading-relaxed">
                    Database connections are established and active. Chat rooms, text histories, and password protected files are stored permanently and securely inside your MongoDB Atlas cluster.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
