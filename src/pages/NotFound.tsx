import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans text-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-850 bg-slate-900/60 p-8 text-center space-y-5">
        <AlertCircle className="h-12 w-12 text-indigo-400 mx-auto animate-bounce" />
        <h3 className="text-xl font-bold text-white">404 - Page Not Found</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          The requested page could not be located. It might have been moved or deleted.
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
