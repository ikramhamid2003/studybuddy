import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BookOpen,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  Menu,
  X,
  Zap,
} from "lucide-react";

const navItems = [
  { to: "/explain", label: "Explain", icon: BookOpen, color: "text-amber-400" },
  { to: "/summarize", label: "Summarize", icon: FileText, color: "text-emerald-400" },
  { to: "/quiz", label: "Quiz", icon: Zap, color: "text-violet-400" },
  { to: "/flashcards", label: "Flashcards", icon: Layers, color: "text-sky-400" },
  { to: "/chat", label: "Chat", icon: MessageSquare, color: "text-rose-400" },
];

const glowColors = {
  "/explain": "bg-amber-500/10 shadow-[0_0_160px_rgba(245,158,11,0.12)]",
  "/summarize": "bg-emerald-500/10 shadow-[0_0_160px_rgba(16,185,129,0.12)]",
  "/quiz": "bg-violet-500/10 shadow-[0_0_160px_rgba(139,92,246,0.12)]",
  "/flashcards": "bg-sky-500/10 shadow-[0_0_160px_rgba(14,165,233,0.12)]",
  "/chat": "bg-rose-500/10 shadow-[0_0_160px_rgba(244,63,94,0.12)]",
};

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const activeGlow = glowColors[location.pathname] || "bg-amber-500/10";

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      {/* Dynamic Ambient Background Glow & Grid */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-[130px] transition-all duration-700 pointer-events-none ${activeGlow}`} />
      <div className="absolute inset-0 bg-grid bg-grid-pattern opacity-[0.03] pointer-events-none" />
      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 flex flex-col
          bg-slate-900 border-r border-slate-800 relative z-20
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:flex
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-tight">
              StudyBuddy
            </h1>
            <p className="text-slate-500 text-xs font-mono">AI · Free</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          <p className="text-slate-600 text-xs font-mono uppercase tracking-widest px-3 mb-3">
            Tools
          </p>
          {navItems.map(({ to, label, icon: Icon, color }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${
                      isActive ? color : "text-slate-500 group-hover:" + color.split("-")[1]
                    } ${isActive ? "" : "group-hover:" + color}`}
                    size={18}
                  />
                  {label}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User / Logout */}
        {user ? (
          <div className="px-6 py-4 border-t border-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-slate-900 font-bold text-sm">
                {user.username[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm font-semibold truncate">{user.username}</p>
                <p className="text-slate-500 text-xs truncate">Student</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="px-6 py-4 border-t border-slate-800 flex flex-col gap-2">
            <NavLink
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-bold transition-colors"
            >
              Log In
            </NavLink>
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-4 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-slate-400 text-xs leading-relaxed">
              Powered by{" "}
              <span className="text-amber-400 font-medium">Llama 3.3 70B</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative z-10">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-slate-900" />
            </div>
            <span className="font-display font-bold text-white">StudyBuddy</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}