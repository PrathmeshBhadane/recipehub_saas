import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import { ChefHat, Mail, Lock, User, Sparkles } from "lucide-react";

export const Auth: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || (!isLogin && !email)) {
      toast.warning("Please fill out all fields.");
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
        toast.success("Welcome back! Login successful.");
      } else {
        await register(username, email, password);
        toast.success("Account created successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-screen w-screen fixed inset-0 flex items-center justify-center bg-[var(--bg-primary)] overflow-hidden">
      {/* Decorative gradient blurs */}
      <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-[var(--accent-primary)] opacity-10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-[var(--accent-emerald)] opacity-5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md p-8 glass-panel border border-[var(--border-color)] z-10 hover-card">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="p-3.5 bg-[var(--accent-primary)] rounded-2xl text-white glow-accent">
            <ChefHat className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] mt-3">
            {isLogin ? "Welcome to TasteGram" : "Join TasteGram"}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {isLogin ? "Sign in to manage meals and explore recommendations" : "Get started with advanced AI meal planning"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm transition-colors"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm transition-colors"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-[var(--accent-primary-glow)] flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {isLogin ? "Sign In" : "Create Account"}
              </>
            )}
          </button>
        </form>

        {/* Switcher */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[var(--accent-primary)] hover:underline font-semibold"
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Auth;
