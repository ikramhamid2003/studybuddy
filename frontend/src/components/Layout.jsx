import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTE_GLOW } from "../utils/routeColors";
import {
  BookOpen,
  FileText,
  Layers,
  LayoutGrid,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  LogIn,
  LogOut,
} from "lucide-react";

// Hover accents are written as complete class strings so Tailwind's compiler
// can see them; building them at runtime from `color` produces no CSS.
const navItems = [
  { to: "/all", label: "All", icon: LayoutGrid, color: "text-fuchsia-400", hover: "group-hover:text-fuchsia-400" },
  { to: "/explain", label: "Explain", icon: BookOpen, color: "text-amber-400", hover: "group-hover:text-amber-400" },
  { to: "/summarize", label: "Summarize", icon: FileText, color: "text-emerald-400", hover: "group-hover:text-emerald-400" },
  { to: "/quiz", label: "Quiz", icon: Zap, color: "text-violet-400", hover: "group-hover:text-violet-400" },
  { to: "/flashcards", label: "Flashcards", icon: Layers, color: "text-sky-400", hover: "group-hover:text-sky-400" },
  { to: "/chat", label: "Chat", icon: MessageSquare, color: "text-rose-400", hover: "group-hover:text-rose-400" },
];

// Each tool owns an accent color so navigation, buttons, and page chrome feel
// connected without every page redefining the same palette.

export default function Layout({ children }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeGlow = ROUTE_GLOW[location.pathname] || "bg-amber-500/10";
  // Mobile header uses this to show the active tool name in the dropdown.
  const currentItem = navItems.find((item) => item.to === location.pathname);

  function handleLogoClick() {
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-success-950 flex relative overflow-hidden">
      {/* Dynamic ambient background glow and grid */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-[130px] transition-all duration-700 pointer-events-none ${activeGlow}`} />
      <div className="absolute inset-0 bg-grid bg-grid-pattern opacity-[0.03] pointer-events-none" />
      {/* ── Sidebar (desktop only) - Fixed/Static, collapses to an icon rail ── */}
      <aside
        aria-label="Main navigation"
        className={`hidden lg:flex flex-col shrink-0 fixed top-0 left-0 h-screen z-30 bg-slate-900 border-r border-slate-800 transition-[width] duration-200 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo */}
        <div
          className={`flex items-center border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 rounded-xl mx-3 py-5 transition-colors ${
            sidebarCollapsed ? "justify-center px-2" : "gap-3 px-6"
          }`}
          onClick={handleLogoClick}
          title="StudyBuddy home"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-slate-900" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="font-display font-bold text-white text-lg leading-tight">
                StudyBuddy
              </h1>
              <p className="text-slate-500 text-xs font-mono">AI · Free</p>
            </div>
          )}
        </div>

        {/* Desktop navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto" aria-label="Tools">
          <div
            className={`flex items-center mb-3 ${sidebarCollapsed ? "justify-center" : "justify-between px-3"}`}
          >
            {!sidebarCollapsed && (
              <p className="text-slate-600 text-xs font-mono uppercase tracking-widest">
                Tools
              </p>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          {navItems.map(({ to, label, icon: Icon, color, hover }) => (
            <NavLink
              key={to}
              to={to}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${sidebarCollapsed ? "justify-center px-2" : "px-3"}
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
                      isActive ? color : `text-slate-500 ${hover}`
                    }`}
                    size={18}
                  />
                  {!sidebarCollapsed && label}
                  {isActive && !sidebarCollapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User controls */}
        {user ? (
          <div
            className={`border-t border-slate-800 flex flex-col gap-2 ${
              sidebarCollapsed ? "px-2 py-4 items-center" : "px-6 py-4"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-slate-900 font-bold text-sm flex-shrink-0">
                S
              </div>
              {!sidebarCollapsed && (
                <p className="text-white text-sm font-semibold truncate">Student</p>
              )}
            </div>
            <button
              onClick={logout}
              aria-label="Sign Out"
              title="Sign Out"
              className={`rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                sidebarCollapsed ? "w-9 h-9 p-0" : "mt-2 w-full px-3 py-2"
              }`}
            >
              {sidebarCollapsed ? <LogOut size={15} /> : "Sign Out"}
            </button>
          </div>
        ) : (
          <div
            className={`border-t border-slate-800 flex flex-col gap-2 ${
              sidebarCollapsed ? "px-2 py-4 items-center" : "px-6 py-4"
            }`}
          >
            <NavLink
              to="/login"
              aria-label="Log In"
              title="Log In"
              className={`flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold transition-colors ${
                sidebarCollapsed ? "w-9 h-9 p-0" : "px-3 py-2 text-sm"
              }`}
            >
              {sidebarCollapsed ? <LogIn size={16} /> : "Log In"}
            </NavLink>
          </div>
        )}

        {/* Footer info */}
        {!sidebarCollapsed && (
          <div className="px-6 py-4 border-t border-slate-800">
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-slate-400 text-xs leading-relaxed">
                Powered by{" "}
                <span className="text-amber-400 font-medium">Llama 3.3 70B</span>
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative z-10">
        {/* Mobile header with dropdown navigation */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-slate-900" />
            </div>
            <span className="font-display font-bold text-white">StudyBuddy</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
            >
              {currentItem ? currentItem.label : "Menu"}
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 z-50 rounded-xl border border-slate-800 bg-slate-900 shadow-card overflow-hidden">
                  <nav className="p-2 space-y-1">
                    {navItems.map(({ to, label, icon: Icon, color }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setDropdownOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-slate-800 text-white"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? color : "text-slate-500"}`}
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

                  {user && (
                    <div className="border-t border-slate-800 p-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-slate-900 font-bold text-xs">
                          S
                        </div>
                        <p className="text-white text-sm font-semibold">Student</p>
                      </div>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main
          className={`flex-1 overflow-y-auto transition-[margin] duration-200 ${
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
