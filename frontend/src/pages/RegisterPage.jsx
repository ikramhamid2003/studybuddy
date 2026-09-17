import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { UserPlus, Key, Mail, User, Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input } from "../components/Input";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    // Keep the most common validation failures on the client for faster, clearer
    // form feedback.
    if (!username.trim() || !email.trim() || !password.trim()) {
      return toast.error("Please fill in all fields");
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }

    if (password !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    try {
      // Register auto-logs in through AuthContext, then sends the user into the
      // protected workspace.
      await register(username, email, password);
      toast.success("Account created successfully!");
      navigate("/explain");
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const passwordError = password.length > 0 && password.length < 6 ? "Password must be at least 6 characters" : undefined;
  const confirmError = confirmPassword.length > 0 && confirmPassword !== password ? "Passwords do not match" : undefined;
  const usernameError = username.length > 0 && username.length < 3 ? "Username must be at least 3 characters" : undefined;
  const emailError = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Please enter a valid email" : undefined;

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 animate-fade-in relative">
      {/* Vibrant background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-rose-500/5 to-amber-500/10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-violet-500/10 to-rose-500/10 rounded-full blur-[150px] opacity-30 pointer-events-none" />
      
      <Card variant="elevated" className="w-full max-w-md border-t-4 border-t-amber-400 p-8 animate-fade-up relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgba(245,158,11,0.4)]">
            <Sparkles className="text-slate-900" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="text-slate-300 text-sm mt-2">Join StudyBuddy and start studying smarter today!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            leftIcon={<User className="w-4 h-4" />}
            disabled={loading}
            error={usernameError}
            hint="At least 3 characters"
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            disabled={loading}
            error={emailError}
            hint="We'll never share your email"
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            leftIcon={<Key className="w-4 h-4" />}
            rightIcon={showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            onRightIconClick={() => setShowPassword(!showPassword)}
            disabled={loading}
            error={passwordError}
            hint="Minimum 6 characters"
          />

          <Input
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            leftIcon={<Key className="w-4 h-4" />}
            rightIcon={showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={loading}
            error={confirmError}
            hint="Must match password above"
          />

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            <UserPlus className="w-4 h-4 mr-2" />
            Create Account
          </Button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
            Log In
          </Link>
        </p>
      </Card>
    </div>
  );
}
