import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastContainer, toast } from "./components/Toast";
import Navbar from "./components/Navbar";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RecipeExplorer from "./pages/RecipeExplorer";
import MealPlanner from "./pages/MealPlanner";
import AIAssistant from "./pages/AIAssistant";
import RecommendationVisualizer from "./pages/RecommendationVisualizer";
import useWebSockets from "./hooks/useWebSockets";

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Hook into live WebSocket feeds (Observer Pattern: prints notifications to toast container)
  useWebSockets((msg) => {
    if (msg.type === "info") {
      setWsConnected(true);
      console.log(msg.text);
    } else if (msg.type === "cook") {
      toast.success(msg.text || "Someone cooked a recipe!");
    } else if (msg.type === "notification") {
      toast.info(msg.text || "New notification");
    }
  });

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[var(--bg-primary)] flex flex-col gap-4 items-center justify-center">
        <span className="w-10 h-10 border-4 border-[var(--accent-violet)]/30 border-t-[var(--accent-violet)] rounded-full animate-spin"></span>
        <span className="text-sm font-bold text-[var(--text-secondary)]">Authenticating session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Auth />
        <ToastContainer />
      </>
    );
  }

  return (
    <Router>
      {/* Root layout: sidebar fixed, main area scrollable */}
      <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Navigation Sidebar — fixed, full height */}
        <Navbar wsConnected={wsConnected} />

        {/* Main Content Area — takes remaining width, scrolls independently */}
        <main className="flex-1 flex flex-col md:pl-64 h-screen overflow-y-auto">
          {/* Mobile top-bar spacer so content doesn't hide behind sticky header */}
          <div className="md:hidden h-[60px] shrink-0" />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/recipes" element={<RecipeExplorer />} />
              <Route path="/planner" element={<MealPlanner />} />
              <Route path="/ai" element={<AIAssistant />} />
              <Route path="/recommendations" element={<RecommendationVisualizer />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* Toast Alerts Tray */}
        <ToastContainer />
      </div>
    </Router>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
