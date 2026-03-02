import { useState } from "react";
import { NavLink } from "react-router-dom";
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

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 flex flex-col
          bg-slate-900 border-r border-slate-800
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
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
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