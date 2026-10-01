import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  User,
} from "lucide-react";

const navItems = [
  {
    to: "/all",
    label: "All Tools",
    icon: LayoutGrid,
    activeColor: "text-fuchsia-600",
  },
  {
    to: "/explain",
    label: "Explain",
    icon: BookOpen,
    activeColor: "text-amber-600",
  },
  {
    to: "/summarize",
    label: "Summarize",
    icon: FileText,
    activeColor: "text-emerald-600",
  },
  {
    to: "/quiz",
    label: "Quiz",
    icon: Zap,
    activeColor: "text-violet-600",
  },
  {
    to: "/flashcards",
    label: "Flashcards",
    icon: Layers,
    activeColor: "text-sky-600",
  },
  {
    to: "/chat",
    label: "AI Tutor",
    icon: MessageSquare,
    activeColor: "text-rose-600",
  },
];

export default function Layout({ children }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentItem = navItems.find((item) => item.to === location.pathname);

  function handleLogoClick() {
    navigate("/");
  }

  return (
    <div className="app-height bg-slate-50 flex relative overflow-hidden">
      {/* ── Sidebar (desktop only) ── */}
      <aside
        aria-label="Main navigation"
        className={`hidden lg:flex flex-col shrink-0 fixed top-0 left-0 h-screen z-30 nb-sidebar transition-[width] duration-200 ${
          sidebarCollapsed ? "w-[68px]" : "w-[240px]"
        }`}
      >
        {/* Logo */}
        <div
          className={`flex items-center border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors py-4 ${
            sidebarCollapsed ? "justify-center px-4" : "gap-2.5 px-5"
          }`}
          onClick={handleLogoClick}
          title="StudyBuddy home"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="font-semibold text-slate-900 text-base leading-tight tracking-tight">
                StudyBuddy
              </h1>
              <p className="text-slate-600 text-xs">AI · Free</p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <div className={`flex items-center px-3 pt-4 pb-1 ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
          {!sidebarCollapsed && (
            <p className="text-slate-600 text-[11px] font-medium uppercase tracking-widest px-1">
              Tools
            </p>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="icon-button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Desktop navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto" aria-label="Tools">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) =>
                `nb-nav-item ${sidebarCollapsed ? "justify-center px-2" : ""}
                 ${isActive ? "nb-nav-item--active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-500"}`}
                    size={17}
                  />
                  {!sidebarCollapsed && (
                    <span className={isActive ? "text-indigo-700" : ""}>{label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User controls */}
        {user ? (
          <div className={`border-t border-slate-200 ${sidebarCollapsed ? "px-3 py-4 flex flex-col items-center gap-2" : "px-4 py-4"}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <User size={15} />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-slate-800 text-sm font-medium truncate">
                    {user.username || "Student"}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={logout}
                aria-label="Sign Out"
                className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            )}
            {sidebarCollapsed && (
              <button
                onClick={logout}
                aria-label="Sign Out"
                className="icon-button"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        ) : (
          <div className={`border-t border-slate-200 ${sidebarCollapsed ? "px-3 py-4 flex flex-col items-center" : "px-4 py-4"}`}>
            <NavLink
              to="/login"
              aria-label="Log In"
              className={`btn-primary ${sidebarCollapsed ? "w-10 h-10 p-0" : "w-full justify-center"}`}
            >
              {sidebarCollapsed ? <LogIn size={16} /> : <>
                <LogIn size={15} />
                Sign in
              </>}
            </NavLink>
          </div>
        )}

        {/* Powered by */}
        {!sidebarCollapsed && (
          <div className="px-4 pb-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
              <p className="text-slate-600 text-xs leading-relaxed">
                Powered by{" "}
                <span className="text-indigo-600 font-medium">Groq LLM</span>
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm">StudyBuddy</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              className={`
                flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all duration-150
                ${
                  dropdownOpen
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-400/30 shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                }
              `}
            >
              <span className="font-medium">{currentItem ? currentItem.label : "Menu"}</span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180 text-indigo-600" : "text-slate-400"
                }`}
              />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="dropdown-panel absolute right-0 top-full mt-1.5 w-60 z-50 animate-scale-in">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Study Tools
                  </div>
                  <nav className="p-1 space-y-0.5" aria-label="Tools menu">
                    {navItems.map(({ to, label, icon: Icon, activeColor }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setDropdownOpen(false)}
                        className={({ isActive }) =>
                          `menu-item ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`flex-shrink-0 transition-colors ${
                                isActive ? activeColor : "text-slate-400"
                              }`}
                              size={16}
                            />
                            <span className="flex-1">{label}</span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </nav>

                  {user && (
                    <>
                      <div className="dropdown-divider" />
                      <div className="p-1">
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 mb-1">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-indigo-600" />
                          </div>
                          <p className="text-slate-800 text-xs font-semibold truncate flex-1">
                            {user.username || "Student"}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                          }}
                          className="dropdown-item dropdown-item--quiet text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <LogOut size={15} className="flex-shrink-0" />
                          Sign out
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
            sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"
          }`}
        >
          <div className="flex w-full flex-1 flex-col min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
