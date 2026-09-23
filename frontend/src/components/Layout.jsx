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

// Each tool owns a hue. Every state carries it as complete class strings, so
// the accent is visible on hover and unmistakable when active, instead of the
// grey-on-grey the rail used before.
const navItems = [
  {
    to: "/all",
    label: "All",
    icon: LayoutGrid,
    color: "text-fuchsia-300",
    hover: "group-hover:text-fuchsia-300",
    idle: "border border-transparent hover:bg-fuchsia-500/10 hover:text-fuchsia-100",
    active: "bg-fuchsia-500/15 border border-fuchsia-400/40 text-fuchsia-100",
    dot: "bg-fuchsia-400",
    menu: "text-fuchsia-200 hover:text-fuchsia-100 hover:bg-fuchsia-500/15",
  },
  {
    to: "/explain",
    label: "Explain",
    icon: BookOpen,
    color: "text-amber-300",
    hover: "group-hover:text-amber-300",
    idle: "border border-transparent hover:bg-amber-500/10 hover:text-amber-100",
    active: "bg-amber-500/15 border border-amber-400/40 text-amber-100",
    dot: "bg-amber-400",
    menu: "text-amber-200 hover:text-amber-100 hover:bg-amber-500/15",
  },
  {
    to: "/summarize",
    label: "Summarize",
    icon: FileText,
    color: "text-emerald-300",
    hover: "group-hover:text-emerald-300",
    idle: "border border-transparent hover:bg-emerald-500/10 hover:text-emerald-100",
    active: "bg-emerald-500/15 border border-emerald-400/40 text-emerald-100",
    dot: "bg-emerald-400",
    menu: "text-emerald-200 hover:text-emerald-100 hover:bg-emerald-500/15",
  },
  {
    to: "/quiz",
    label: "Quiz",
    icon: Zap,
    color: "text-violet-300",
    hover: "group-hover:text-violet-300",
    idle: "border border-transparent hover:bg-violet-500/10 hover:text-violet-100",
    active: "bg-violet-500/15 border border-violet-400/40 text-violet-100",
    dot: "bg-violet-400",
    menu: "text-violet-200 hover:text-violet-100 hover:bg-violet-500/15",
  },
  {
    to: "/flashcards",
    label: "Flashcards",
    icon: Layers,
    color: "text-sky-300",
    hover: "group-hover:text-sky-300",
    idle: "border border-transparent hover:bg-sky-500/10 hover:text-sky-100",
    active: "bg-sky-500/15 border border-sky-400/40 text-sky-100",
    dot: "bg-sky-400",
    menu: "text-sky-200 hover:text-sky-100 hover:bg-sky-500/15",
  },
  {
    to: "/chat",
    label: "Chat",
    icon: MessageSquare,
    color: "text-rose-300",
    hover: "group-hover:text-rose-300",
    idle: "border border-transparent hover:bg-rose-500/10 hover:text-rose-100",
    active: "bg-rose-500/15 border border-rose-400/40 text-rose-100",
    dot: "bg-rose-400",
    menu: "text-rose-200 hover:text-rose-100 hover:bg-rose-500/15",
  },
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
    <div className="app-height bg-slate-950 flex relative overflow-hidden">
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
              <p className="text-slate-400 text-xs font-mono">AI · Free</p>
            </div>
          )}
        </div>

        {/* Desktop navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto" aria-label="Tools">
          <div
            className={`flex items-center mb-3 ${sidebarCollapsed ? "justify-center" : "justify-between px-3"}`}
          >
            {!sidebarCollapsed && (
              <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
                Tools
              </p>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="icon-button"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          {navItems.map(({ to, label, icon: Icon, color, hover, idle, active, dot }) => (
            <NavLink
              key={to}
              to={to}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group
                ${sidebarCollapsed ? "justify-center px-2" : "px-3"}
                ${isActive ? active : `text-slate-400 ${idle}`}`
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
                    <span
                      className={`ml-auto w-1.5 h-1.5 rounded-full ${dot}`}
                      aria-hidden="true"
                    />
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
                <span className="text-amber-400 font-medium">GPT-OSS 120B</span>
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
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
                <div className="menu-panel absolute right-0 top-full mt-2 w-56 z-50 animate-fade-in">
                  <nav className="p-2 space-y-0.5" aria-label="Tools menu">
                    {navItems.map(({ to, label, icon: Icon, color, dot, menu }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setDropdownOpen(false)}
                        className={`menu-item ${menu}`}
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? color : ""}`}
                              size={18}
                            />
                            {label}
                            {isActive && (
                              <span
                                className={`ml-auto w-1.5 h-1.5 rounded-full ${dot}`}
                                aria-hidden="true"
                              />
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </nav>

                  {user && (
                    <>
                      <div className="menu-divider" />
                      <div className="p-2">
                        <div className="flex items-center gap-2 px-3 py-2">
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
                          className="menu-item menu-item--quiet"
                        >
                          <LogOut size={16} className="flex-shrink-0" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main
          className={`flex flex-1 flex-col overflow-y-auto transition-[margin] duration-200 ${
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
          }`}
        >
          {/* The wrapper is a flex column so a page can claim the leftover
              viewport height (the chat workspace does) instead of guessing it
              with a hardcoded 100vh offset. */}
          <div className="flex w-full flex-1 flex-col min-h-0 px-3 py-6 sm:px-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
