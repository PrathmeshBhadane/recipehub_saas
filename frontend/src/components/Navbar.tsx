import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { toast } from "./Toast";
import { Modal } from "./Modal";
import { 
  LayoutDashboard, 
  Search, 
  Calendar, 
  Sparkles, 
  ThumbsUp, 
  LogOut, 
  Sun, 
  Moon,
  ChefHat,
  Settings,
  Menu,
  X
} from "lucide-react";

interface NavbarProps {
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ wsConnected }) => {
  const { user, logout, apiFetch } = useAuth();
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const location = useLocation();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.warning("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      toast.success("Password updated successfully!");
      setIsSettingsOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const links = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: "/recipes", label: "Recipe Explorer", icon: <Search className="w-5 h-5" /> },
    { path: "/planner", label: "Meal Planner", icon: <Calendar className="w-5 h-5" /> },
    { path: "/ai", label: "AI Assistant", icon: <Sparkles className="w-5 h-5" /> },
    { path: "/recommendations", label: "Recommendations", icon: <ThumbsUp className="w-5 h-5" /> },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Header Bar — sticky at top of viewport on small screens */}
      <header className="md:hidden flex items-center justify-between px-6 py-0 h-[60px] bg-[var(--bg-secondary)] border-b border-[var(--border-color)] fixed top-0 left-0 right-0 w-full z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-white ${
            colorTheme === "instagram"
              ? "bg-gradient-to-tr from-[#f9ce34] via-[#e1306c] to-[#6228d7]"
              : "bg-[var(--accent-primary)]"
          }`}>
            <ChefHat className="w-5 h-5" />
          </div>
          <h1 className="text-md font-extrabold tracking-tight text-[var(--text-primary)]">TasteGram</h1>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-all"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Dark Backdrop Overlay on Mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
        />
      )}

      <aside className={`w-64 h-screen fixed top-0 left-0 bg-[var(--bg-secondary)]/90 backdrop-blur-xl border-r border-[var(--border-color)] flex flex-col justify-between p-6 z-50 shadow-2xl transition-transform duration-300 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="flex flex-col gap-8">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl text-white glow-accent ${
                colorTheme === "instagram"
                  ? "bg-gradient-to-tr from-[#f9ce34] via-[#e1306c] to-[#6228d7]"
                  : "bg-[var(--accent-primary)]"
              }`}>
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-[var(--text-primary)] leading-none">TasteGram</h1>
                <span className="text-xs text-[var(--text-muted)] font-medium">Gourmet Network</span>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* WebSocket Connection Status Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)]/80 rounded-lg border border-[var(--border-color)]">
          <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-[var(--accent-emerald)] animate-pulse" : "bg-[var(--accent-rose)]"}`}></span>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {wsConnected ? "Live Feed Sync" : "Sync Offline"}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1.5">
          {links.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:translate-x-1 ${
                  active 
                    ? colorTheme === "instagram"
                      ? "bg-gradient-to-r from-[#f9ce34] via-[#e1306c] to-[#6228d7] text-white shadow-lg shadow-[var(--accent-primary-glow)] border-l-4 border-white"
                      : "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)]/80 text-white shadow-lg shadow-[var(--accent-primary-glow)] border-l-4 border-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-5 border-t border-[var(--border-color)] pt-5">
        {/* Color Theme Accent Picker */}
        <div className="flex flex-col gap-2 px-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Theme Accent</span>
          <div className="flex gap-2">
            {[
              { id: "violet", class: "bg-violet-500 hover:bg-violet-600" },
              { id: "emerald", class: "bg-emerald-500 hover:bg-emerald-600" },
              { id: "amber", class: "bg-amber-500 hover:bg-amber-600" },
              { id: "rose", class: "bg-rose-500 hover:bg-rose-600" },
              { id: "blue", class: "bg-blue-500 hover:bg-blue-600" },
              { id: "instagram", class: "bg-gradient-to-tr from-[#f9ce34] via-[#e1306c] to-[#6228d7] hover:scale-105" }
            ].map(color => (
              <button
                key={color.id}
                onClick={() => setColorTheme(color.id as any)}
                className={`w-5 h-5 rounded-full ${color.class} transition-all duration-200 cursor-pointer ${
                  colorTheme === color.id 
                    ? "ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110" 
                    : "hover:scale-105"
                }`}
                title={`${color.id.charAt(0).toUpperCase() + color.id.slice(1)} accent`}
              />
            ))}
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="flex flex-col gap-1 px-2 border-t border-[var(--border-color)]/30 pt-4">
            <p className="text-sm font-bold text-[var(--text-primary)]">{user.username}</p>
            <p className="text-xs text-[var(--text-muted)] capitalize">{user.role} role</p>
          </div>
        )}

        {/* Theme and Logout Controls */}
        <div className="flex gap-2 justify-between">
          <button
            onClick={toggleTheme}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex justify-center items-center"
            title="Toggle theme"
            type="button"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex justify-center items-center"
            title="Security Settings"
            type="button"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={logout}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] hover:bg-red-950/20 hover:border-red-900/50 hover:text-red-400 text-[var(--text-secondary)] transition-all flex justify-center items-center"
            title="Logout"
            type="button"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }}
        title="Security Settings"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Verify your identity by entering your current password, then specify your new security credentials below.
          </p>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(false);
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all cursor-pointer ${
                colorTheme === "instagram"
                  ? "bg-gradient-to-tr from-[#f9ce34] via-[#e1306c] to-[#6228d7] hover:scale-105 active:scale-95"
                  : "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 active:scale-95"
              }`}
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </Modal>
      </aside>
    </>
  );
};
export default Navbar;
