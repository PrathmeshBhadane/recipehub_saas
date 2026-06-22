import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { 
  Users, 
  ChefHat, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  ImageIcon
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface StorySlide {
  id: number;
  media_url: string;
  media_type: "image" | "video";
  caption: string;
}

interface LiveStory {
  creator_id: number;
  creator: string;
  slides: StorySlide[];
}

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface DashboardData {
  kpis: {
    total_users: number;
    total_recipes: number;
    total_actions: number;
    retention_rate: number;
    wau: number;
    mau: number;
  };
  activity_breakdown: Array<{ name: string; value: number }>;
  popular_recipes: Array<{ name: string; score: number }>;
  macro_by_tag: Array<{ tag: string; calories: number; protein: number; carbs: number; fat: number }>;
  daily_engagement: Array<{ date: string; actions: number }>;
}

const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#f43f5e"];

export const Dashboard: React.FC = () => {
  const { apiFetch, token, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamic live stories from API
  const [liveStories, setLiveStories] = useState<LiveStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  // Story viewer state
  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStories = async () => {
    setStoriesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stories/`);
      if (res.ok) {
        const data = await res.json();
        setLiveStories(data);
      }
    } catch {
      // silently fail — stories are non-critical
    } finally {
      setStoriesLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) {
      toast.error("Please select an image or video file.");
      return;
    }

    // Check 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewType(isVideo ? "video" : "image");
  };

  const handlePostStory = async () => {
    if (!selectedFile) {
      toast.warning("Please choose a photo or video first.");
      return;
    }
    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption);

      const res = await fetch(`${API_BASE}/stories/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }

      toast.success("Your story is live for 24 hours! 🎉");
      setIsUploadOpen(false);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCaption("");
      fetchStories(); // Refresh stories bar
    } catch (err: any) {
      toast.error(err.message || "Failed to post story.");
    } finally {
      setIsPosting(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadOpen(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption("");
  };

  const handleNextSlide = () => {
    if (activeStoryIdx === null) return;
    const currentStory = liveStories[activeStoryIdx];
    if (activeSlideIdx < currentStory.slides.length - 1) {
      setActiveSlideIdx(activeSlideIdx + 1);
      setProgress(0);
    } else {
      if (activeStoryIdx < liveStories.length - 1) {
        setActiveStoryIdx(activeStoryIdx + 1);
        setActiveSlideIdx(0);
        setProgress(0);
      } else {
        setActiveStoryIdx(null);
        setActiveSlideIdx(0);
      }
    }
  };

  const handlePrevSlide = () => {
    if (activeStoryIdx === null) return;
    if (activeSlideIdx > 0) {
      setActiveSlideIdx(activeSlideIdx - 1);
      setProgress(0);
    } else {
      if (activeStoryIdx > 0) {
        const prevStoryIdx = activeStoryIdx - 1;
        setActiveStoryIdx(prevStoryIdx);
        setActiveSlideIdx(liveStories[prevStoryIdx].slides.length - 1);
        setProgress(0);
      } else {
        setProgress(0);
      }
    }
  };

  useEffect(() => {
    if (activeStoryIdx === null) return;
    setProgress(0);
    const duration = 5000;
    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { handleNextSlide(); return 0; }
        return prev + step;
      });
    }, intervalTime);
    return () => clearInterval(timer);
  }, [activeStoryIdx, activeSlideIdx]);

  const fetchAnalytics = async () => {
    try {
      const responseData = await apiFetch("/analytics/dashboard");
      setData(responseData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchStories();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 w-full">
        <div className="h-10 w-48 bg-[var(--bg-tertiary)] rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-[var(--bg-secondary)] rounded-xl animate-pulse"></div>
          ))}
        </div>
        <SkeletonLoader type="chart" count={2} />
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_users: 0,
    total_recipes: 0,
    total_actions: 0,
    retention_rate: 0,
    wau: 0,
    mau: 0
  };

  const cards = [
    { title: "Total Users", value: kpis.total_users, desc: `${kpis.wau} active this week`, icon: <Users className="w-6 h-6 text-purple-400" />, glow: "hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]" },
    { title: "Recipe Catalog", value: kpis.total_recipes, desc: "Seeded & user generated", icon: <ChefHat className="w-6 h-6 text-emerald-400" />, glow: "hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]" },
    { title: "User Interactions", value: kpis.total_actions, desc: "Views, likes, & cooks logged", icon: <Activity className="w-6 h-6 text-amber-400" />, glow: "hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]" },
    { title: "Weekly Retention", value: `${kpis.retention_rate}%`, desc: "Ratio of WAU / MAU active", icon: <TrendingUp className="w-6 h-6 text-rose-400" />, glow: "hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.12)]" }
  ];

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full animate-fade-in">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">TasteGram Portal</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Real-time culinary analytics and food lover engagement dashboards</p>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchAnalytics(); }}
          className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-semibold rounded-xl text-[var(--text-primary)] transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Stories Bar */}
      <div className="glass-panel p-4 border border-[var(--border-color)] flex gap-5 overflow-x-auto scrollbar-thin items-center">
        {/* Your Story Button */}
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex flex-col items-center gap-1.5 focus:outline-none shrink-0 group transition-transform active:scale-95"
        >
          <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#e1306c] to-[#6228d7] group-hover:scale-105 transition-all duration-300">
            <div className="p-[2px] rounded-full bg-[var(--bg-secondary)]">
              <div className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)]">
                <Plus className="w-6 h-6" />
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
            {user?.username || "Your Story"}
          </span>
        </button>

        {/* Divider */}
        {liveStories.length > 0 && (
          <div className="h-16 w-px bg-[var(--border-color)] shrink-0" />
        )}

        {/* Live Stories from API */}
        {storiesLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
              <div className="w-12 h-2 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            </div>
          ))
        ) : liveStories.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] px-4">No stories yet — be the first to post! 🍽️</p>
        ) : (
          liveStories.map((story, idx) => (
            <button
              key={story.creator_id}
              onClick={() => { setActiveStoryIdx(idx); setActiveSlideIdx(0); setProgress(0); }}
              className="flex flex-col items-center gap-1.5 focus:outline-none shrink-0 group transition-transform active:scale-95"
            >
              <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#e1306c] to-[#6228d7] group-hover:scale-105 transition-all duration-300">
                <div className="p-[2px] rounded-full bg-[var(--bg-secondary)]">
                  {/* Avatar initial circle */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[#6228d7] flex items-center justify-center text-white text-xl font-bold select-none">
                    {story.creator.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors max-w-[64px] truncate">
                {story.creator}
              </span>
            </button>
          ))
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className={`glass-panel p-6 border border-[var(--border-color)] hover-card flex items-center justify-between transition-all duration-300 ${card.glow}`}>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{card.title}</span>
              <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{card.value}</span>
              <span className="text-xs text-[var(--text-muted)] mt-1">{card.desc}</span>
            </div>
            <div className="p-3 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-color)] shadow-inner">
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart: Daily Engagement */}
        <div className="glass-panel p-6 border border-[var(--border-color)] lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-bold text-[var(--text-primary)]">Daily Platform Activity</h3>
            <span className="text-xs font-semibold text-[var(--text-muted)]">Past 10 active days</span>
          </div>
          <div className="h-72 w-full">
            {data && data.daily_engagement.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily_engagement} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dx={-5} />
                  <Tooltip 
                    contentStyle={{ 
                      background: "var(--bg-secondary)", 
                      backdropFilter: "blur(12px)", 
                      borderColor: "var(--border-color)", 
                      borderRadius: 12, 
                      boxShadow: "var(--glass-shadow)"
                    }}
                    labelStyle={{ color: "var(--text-primary)", fontWeight: "bold", fontSize: 12 }}
                    itemStyle={{ color: "var(--accent-primary)", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="actions" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorActions)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                <AlertCircle className="w-8 h-8" />
                <span className="text-sm">No activity recorded yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart: Activity Type Breakdown */}
        <div className="glass-panel p-6 border border-[var(--border-color)] flex flex-col gap-4">
          <h3 className="text-md font-bold text-[var(--text-primary)]">User Behaviour Mix</h3>
          <div className="h-56 w-full flex items-center justify-center relative">
            {data && data.activity_breakdown.some(a => a.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.activity_breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.activity_breakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(10,14,23,0.8)" strokeWidth={3} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: "var(--bg-secondary)", 
                      backdropFilter: "blur(12px)", 
                      borderColor: "var(--border-color)", 
                      borderRadius: 12,
                      boxShadow: "var(--glass-shadow)"
                    }}
                    labelStyle={{ color: "var(--text-primary)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                <AlertCircle className="w-8 h-8" />
                <span className="text-sm">No behaviour data</span>
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {data && data.activity_breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-xs text-[var(--text-secondary)] font-medium">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Popular Recipes */}
        <div className="glass-panel p-6 border border-[var(--border-color)] flex flex-col gap-4">
          <h3 className="text-md font-bold text-[var(--text-primary)]">Top Weighted Recipes</h3>
          <div className="h-72 w-full">
            {data && data.popular_recipes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.popular_recipes} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barPopular" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.95}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} vertical={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={80} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: "var(--bg-secondary)", 
                      backdropFilter: "blur(12px)", 
                      borderColor: "var(--border-color)", 
                      borderRadius: 12,
                      boxShadow: "var(--glass-shadow)"
                    }} 
                    labelStyle={{ color: "var(--text-primary)", fontWeight: "bold" }}
                  />
                  <Bar dataKey="score" fill="url(#barPopular)" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                <AlertCircle className="w-8 h-8" />
                <span className="text-sm">No recipes popular yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart: Macro breakdown by tag */}
        <div className="glass-panel p-6 border border-[var(--border-color)] flex flex-col gap-4">
          <h3 className="text-md font-bold text-[var(--text-primary)]">Nutritional Composition by Diet Tag</h3>
          <div className="h-72 w-full">
            {data && data.macro_by_tag.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.macro_by_tag} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barProtein" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="barCarbs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="barFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="tag" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={5} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: "var(--bg-secondary)", 
                      backdropFilter: "blur(12px)", 
                      borderColor: "var(--border-color)", 
                      borderRadius: 12,
                      boxShadow: "var(--glass-shadow)"
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" fontSize={11} />
                  <Bar dataKey="protein" name="Protein (g)" fill="url(#barProtein)" radius={[4, 4, 0, 0]} barSize={10} />
                  <Bar dataKey="carbs" name="Carbs (g)" fill="url(#barCarbs)" radius={[4, 4, 0, 0]} barSize={10} />
                  <Bar dataKey="fat" name="Fat (g)" fill="url(#barFat)" radius={[4, 4, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                <AlertCircle className="w-8 h-8" />
                <span className="text-sm">No tag metadata compiled</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Story Viewer */}
      {activeStoryIdx !== null && liveStories[activeStoryIdx] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl">

            {/* Media — image or video */}
            {liveStories[activeStoryIdx].slides[activeSlideIdx].media_type === "video" ? (
              <video
                key={liveStories[activeStoryIdx].slides[activeSlideIdx].media_url}
                src={`${API_BASE}${liveStories[activeStoryIdx].slides[activeSlideIdx].media_url}`}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <img
                src={`${API_BASE}${liveStories[activeStoryIdx].slides[activeSlideIdx].media_url}`}
                alt="story"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            )}

            {/* Top controls */}
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4 flex flex-col gap-3 z-10">
              {/* Progress bars */}
              <div className="flex gap-1">
                {liveStories[activeStoryIdx].slides.map((_, sIdx) => {
                  let w = 0;
                  if (sIdx < activeSlideIdx) w = 100;
                  else if (sIdx === activeSlideIdx) w = progress;
                  return (
                    <div key={sIdx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full bg-white transition-all duration-75 ease-linear" style={{ width: `${w}%` }} />
                    </div>
                  );
                })}
              </div>
              {/* Creator + close */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[#6228d7] flex items-center justify-center text-white font-bold text-sm border-2 border-white">
                    {liveStories[activeStoryIdx].creator.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-white">{liveStories[activeStoryIdx].creator}</span>
                </div>
                <button onClick={() => setActiveStoryIdx(null)} className="text-white p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tap zones */}
            <div className="absolute inset-y-20 inset-x-0 flex z-0">
              <div className="w-1/2 h-full cursor-pointer" onClick={handlePrevSlide} />
              <div className="w-1/2 h-full cursor-pointer" onClick={handleNextSlide} />
            </div>

            {/* Arrow buttons */}
            <button onClick={handlePrevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all z-10 active:scale-90">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={handleNextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all z-10 active:scale-90">
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Caption */}
            {liveStories[activeStoryIdx].slides[activeSlideIdx].caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 pt-16 z-10">
                <p className="text-sm text-white font-medium drop-shadow-md leading-relaxed">
                  {liveStories[activeStoryIdx].slides[activeSlideIdx].caption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Story Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Your Story</h2>
              <button onClick={closeUploadModal} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* File Picker / Preview Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-full h-64 rounded-2xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-primary)] bg-[var(--bg-primary)] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group"
              >
                {previewUrl ? (
                  previewType === "video" ? (
                    <video src={previewUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                  ) : (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-3 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors">
                    <ImageIcon className="w-12 h-12" />
                    <div className="text-center">
                      <p className="text-sm font-semibold">Click to choose photo or video</p>
                      <p className="text-xs mt-1">JPG, PNG, GIF, WebP, MP4, WebM · Max 50 MB</p>
                    </div>
                  </div>
                )}
                {previewUrl && (
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white text-sm font-semibold">Click to change</p>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Caption */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Caption (optional)</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Share something about this moment... 🍽️"
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-sm resize-none transition-all"
                />
                <span className="text-[10px] text-[var(--text-muted)] text-right">{caption.length}/200</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={closeUploadModal}
                  className="flex-1 py-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostStory}
                  disabled={isPosting || !selectedFile}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-tr from-[#f9ce34] via-[#e1306c] to-[#6228d7] text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPosting ? "Posting..." : "Post Story 🎉"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
