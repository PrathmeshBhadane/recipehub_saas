import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { 
  ThumbsUp, 
  Sparkles, 
  Users, 
  Flame, 
  Clock,
  TrendingUp
} from "lucide-react";

interface Recipe {
  id: number;
  title: string;
  description: string;
  calories: number;
  prep_time: number;
  cook_time: number;
  tags: string[];
}

interface Recommendation {
  recipe: Recipe;
  score: number;
  reason: string;
  algorithm: string;
}

export const RecommendationVisualizer: React.FC = () => {
  const { apiFetch } = useAuth();
  
  // Tab states: 'hybrid' | 'content' | 'collaborative'
  const [activeTab, setActiveTab] = useState<string>("hybrid");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/recommendations/${activeTab}`);
      setRecs(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [activeTab]);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">AI Recommendations</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Personalized recipe matching using similarity metrics and collaborative filters</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--border-color)] pb-px">
        {[
          { id: "hybrid", label: "Hybrid Mix", icon: <Sparkles className="w-4 h-4" /> },
          { id: "content", label: "Content-Based (Tags)", icon: <ThumbsUp className="w-4 h-4" /> },
          { id: "collaborative", label: "Collaborative (Social)", icon: <Users className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[var(--accent-primary)] text-white"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Core List Section */}
      {loading ? (
        <SkeletonLoader type="card" count={3} />
      ) : recs.length === 0 ? (
        <div className="glass-panel p-12 border border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center text-center gap-4">
          <ThumbsUp className="w-12 h-12 text-[var(--text-muted)]" />
          <div>
            <h3 className="text-md font-bold text-[var(--text-primary)]">No personalized recommendations yet</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm">
              We need a bit more activity logs to calculate similarity metrics. Try liking or marking recipes as cooked!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recs.map((item, idx) => {
            const matchPercent = Math.round(item.score * 100);
            return (
              <div 
                key={idx}
                className="glass-panel p-6 border border-[var(--border-color)] hover-card flex flex-col justify-between gap-5 relative overflow-hidden"
              >
                {/* Decorative glow background */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-[var(--accent-primary)] opacity-10 rounded-full blur-xl pointer-events-none"></div>

                <div className="flex justify-between items-start gap-4 z-10">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--accent-primary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border-color)] w-max">
                      {item.algorithm}
                    </span>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1.5">{item.recipe.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1">{item.recipe.description}</p>
                  </div>
                  
                  {/* Gauge Percent Ring */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      {/* Ring Circle outline */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          className="stroke-[var(--bg-tertiary)] fill-none stroke-[4]"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          className="stroke-[var(--accent-emerald)] fill-none stroke-[4]"
                          strokeDasharray={2 * Math.PI * 24}
                          strokeDashoffset={2 * Math.PI * 24 * (1 - item.score)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-xs font-black text-[var(--text-primary)]">{matchPercent}%</span>
                    </div>
                    <span className="text-[9px] font-bold text-[var(--text-muted)] mt-1 uppercase">Match</span>
                  </div>
                </div>

                {/* Score matching explanations */}
                <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex gap-2 items-center text-xs text-gray-300">
                  <TrendingUp className="w-4 h-4 text-[var(--accent-emerald)] shrink-0" />
                  <span className="font-medium">{item.reason}</span>
                </div>

                <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-4 mt-2 text-xs text-[var(--text-secondary)]">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      {item.recipe.prep_time + item.recipe.cook_time} mins
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      {item.recipe.calories} kcal
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {item.recipe.tags && item.recipe.tags.slice(0, 2).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-[9px] uppercase font-semibold text-[var(--text-muted)]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default RecommendationVisualizer;
