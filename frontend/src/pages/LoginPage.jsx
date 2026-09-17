import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { LogIn, Key, User, Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input } from "../components/Input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Free-tier backends sleep when idle and can take up to a minute to wake —
  // tell the user what is happening instead of a silent spinner.
  useEffect(() => {
    if (!loading) {
      setWakingUp(false);
      return;
    }
    const timer = setTimeout(() => setWakingUp(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    // Validate client-side first so the user gets immediate feedback before a
    // network request is made.
    if (!username.trim() || !password.trim()) {
      return toast.error("Please fill in all fields");
    }

    setLoading(true);
    try {
      // AuthProvider stores the token and exposes the signed-in user to routes.
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
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 animate-fade-in">
      <Card variant="elevated" className="w-full max-w-md border-t-4 border-t-amber-400 p-8 animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgba(245,158,11,0.3)]">
            <Sparkles className="text-slate-900" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 text-sm mt-2">Sign in to continue your study journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            leftIcon={<User className="w-4 h-4" />}
            disabled={loading}
            error={username.length > 0 && username.length < 3 ? "Username must be at least 3 characters" : undefined}
            hint="Your unique username"
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
            error={password.length > 0 && password.length < 6 ? "Password must be at least 6 characters" : undefined}
            hint="Minimum 6 characters"
          />

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            <LogIn className="w-4 h-4 mr-2" />
            Log In
          </Button>

          {wakingUp && (
            // Render's free tier can delay the first auth response after idle.
            <p className="text-amber-400/80 text-xs text-center font-mono animate-fade-in">
              Free-tier server is waking up — this can take up to a minute…
            </p>
          )}
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
            Sign Up
          </Link>
        </p>
      </Card>
    </div>
  );
}
