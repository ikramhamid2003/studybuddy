import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { LogIn, Key, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-t-4 border-t-amber-400 p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto mb-3">
            <LogIn className="text-amber-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Log In to StudyBuddy</h2>
          <p className="text-slate-400 text-sm mt-1.5">Welcome back! Access your study dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wider">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <User size={16} />
              </span>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Key size={16} />
              </span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2" size="md">
            Log In
          </Button>
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
