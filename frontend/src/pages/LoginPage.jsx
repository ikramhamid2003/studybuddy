import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { LogIn, Key, User, Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/Input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Free-tier backends sleep when idle.
  useEffect(() => {
    if (!loading) { setWakingUp(false); return; }
    const timer = setTimeout(() => setWakingUp(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      return toast.error("Please fill in all fields");
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Welcome back!");
      navigate("/explain");
    } catch (err) {
      toast.error(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-white" size={22} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to StudyBuddy</h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Continue your study journey
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              leftIcon={<User className="w-4 h-4" />}
              disabled={loading}
              error={username.length > 0 && username.length < 3 ? "Minimum 3 characters" : undefined}
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Key className="w-4 h-4" />}
              rightIcon={showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              onRightIconClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              error={password.length > 0 && password.length < 6 ? "Minimum 6 characters" : undefined}
            />

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-1 rounded-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  <LogIn size={15} />
                  Sign in
                </>
              )}
            </button>

            {wakingUp && (
              <p className="text-amber-600 text-xs text-center animate-fade-in">
                Free-tier server is waking up — may take up to a minute…
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-5">
          Don't have an account?{" "}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
