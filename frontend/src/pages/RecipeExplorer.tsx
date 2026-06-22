import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { toast } from "../components/Toast";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { Modal } from "../components/Modal";
import { 
  Search, 
  Heart, 
  ChefHat, 
  Clock, 
  Flame, 
  Plus, 
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import confetti from "canvas-confetti";

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

interface Recipe {
  id: number;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
  created_by_id?: number;
  images?: string[];
}

export const RecipeExplorer: React.FC = () => {
  const { apiFetch } = useAuth();
  const { colorTheme } = useTheme();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Search and Filter State
  const [search, setSearch] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  
  // Modal states
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  
  // Create Recipe Form State
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [prepTime, setPrepTime] = useState<number>(15);
  const [cookTime, setCookTime] = useState<number>(15);
  const [servings, setServings] = useState<number>(2);
  const [calories, setCalories] = useState<number>(300);
  const [protein, setProtein] = useState<number>(15);
  const [carbs, setCarbs] = useState<number>(30);
  const [fat, setFat] = useState<number>(10);
  const [tagInput, setTagInput] = useState<string>("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", amount: 1, unit: "unit" }]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [images, setImages] = useState<string[]>([""]);
  const [activeRecipeImageIdx, setActiveRecipeImageIdx] = useState<number>(0);

  const handleAddImageRow = () => {
    setImages([...images, ""]);
  };

  const handleImageChange = (idx: number, val: string) => {
    const updated = [...images];
    updated[idx] = val;
    setImages(updated);
  };

  const handleRemoveImageRow = (idx: number) => {
    const updated = [...images];
    updated.splice(idx, 1);
    setImages(updated.length > 0 ? updated : [""]);
  };

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      let url = "/recipes/?";
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (selectedTag) url += `tag=${encodeURIComponent(selectedTag)}&`;
      
      const data = await apiFetch(url);
      setRecipes(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load recipes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchRecipes();
    }, 400); // Debounce search
    return () => clearTimeout(delayDebounce);
  }, [search, selectedTag]);

  const handleLike = async (recipeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/recipes/${recipeId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId, activity_type: "like" })
      });
      toast.success("Added to your favorites!");
    } catch (err: any) {
      // Toggle case inside recipes router throws 200 details for toggles
      if (err.message === "Like removed") {
        toast.info("Removed from favorites.");
      } else {
        toast.error(err.message);
      }
    }
  };

  const handleCook = async (recipeId: number) => {
    try {
      await apiFetch(`/recipes/${recipeId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId, activity_type: "cook" })
      });
      
      const themeHex = {
        violet: "#8b5cf6",
        emerald: "#10b981",
        amber: "#f59e0b",
        rose: "#f43f5e",
        blue: "#3b82f6",
        instagram: "#e1306c"
      };

      // Trigger canvas-confetti burst (Premium aesthetic micro-animation)
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: [themeHex[colorTheme] || "#8b5cf6", "#10b981", "#f59e0b"]
      });

      toast.success("Delish! Cooked activity logged.");
      
      // Fire custom message to local websocket connection if needed,
      // The backend will also broadcast this if users are active.
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddIngredientRow = () => {
    setIngredients([...ingredients, { name: "", amount: 1, unit: "g" }]);
  };

  const handleIngredientChange = (idx: number, field: keyof Ingredient, val: any) => {
    const updated = [...ingredients];
    updated[idx] = { ...updated[idx], [field]: val };
    setIngredients(updated);
  };

  const handleAddInstructionRow = () => {
    setInstructions([...instructions, ""]);
  };

  const handleInstructionChange = (idx: number, val: string) => {
    const updated = [...instructions];
    updated[idx] = val;
    setInstructions(updated);
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out blank rows
    const cleanedIngredients = ingredients.filter(i => i.name.trim() !== "");
    const cleanedInstructions = instructions.filter(i => i.trim() !== "");

    if (cleanedIngredients.length === 0 || cleanedInstructions.length === 0) {
      toast.warning("Please provide ingredients and instructions.");
      return;
    }

    const cleanedImages = images.filter(img => img.trim() !== "");
    const payload = {
      title,
      description,
      ingredients: cleanedIngredients,
      instructions: cleanedInstructions,
      prep_time: prepTime,
      cook_time: cookTime,
      servings,
      calories,
      protein,
      carbs,
      fat,
      tags: tagInput.split(",").map(t => t.trim().toLowerCase()).filter(t => t !== ""),
      images: cleanedImages
    };

    try {
      await apiFetch("/recipes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      toast.success("New recipe published to TasteGram!");
      setIsCreateOpen(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setIngredients([{ name: "", amount: 1, unit: "g" }]);
      setInstructions([""]);
      setImages([""]);
      setTagInput("");
      
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const tagPills = ["vegan", "keto", "vegetarian", "italian", "quick", "dessert"];

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">Recipe Explorer</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Browse, filter, and scale ingredients dynamically</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-sm font-semibold rounded-xl text-white shadow-lg shadow-[var(--accent-primary-glow)] transition-all"
        >
          <Plus className="w-4 h-4" /> Add Recipe
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-6 border border-[var(--border-color)] flex flex-col md:flex-row gap-6 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm transition-colors"
          />
        </div>

        {/* Tag pills */}
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setSelectedTag("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              selectedTag === ""
                ? "bg-[var(--accent-primary)] border-transparent text-white"
                : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            All
          </button>
          {tagPills.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all uppercase tracking-wider ${
                selectedTag === t
                  ? "bg-[var(--accent-primary)] border-transparent text-white"
                  : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <SkeletonLoader type="card" count={3} />
      ) : recipes.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] gap-3">
          <ChefHat className="w-12 h-12" />
          <p className="text-sm font-semibold">No recipes found. Try editing your filters or add a new recipe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => { setSelectedRecipe(recipe); setMultiplier(1); setActiveRecipeImageIdx(0); }}
              className="glass-panel p-6 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 hover:shadow-[var(--accent-primary-glow)] transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent-primary)] transition-colors duration-300">{recipe.title}</h3>
                  <button
                    onClick={(e) => handleLike(recipe.id, e)}
                    className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-red-900/50 hover:bg-red-950/20 text-[var(--text-muted)] hover:text-red-400 rounded-xl transition-all hover:scale-110 duration-200"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{recipe.description}</p>
                
                {/* Tag list */}
                <div className="flex gap-1.5 flex-wrap">
                  {recipe.tags && recipe.tags.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 bg-[var(--bg-tertiary)]/75 border border-[var(--border-color)] text-[10px] uppercase font-semibold text-[var(--text-secondary)] rounded-md tracking-wider">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-semibold">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>{recipe.prep_time + recipe.cook_time} mins</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>{recipe.calories} kcal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <Modal
          isOpen={!!selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          title={selectedRecipe.title}
        >
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Image Slider/Carousel */}
            <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-tertiary)] flex items-center justify-center group/slider shadow-lg">
              {selectedRecipe.images && selectedRecipe.images.length > 0 ? (
                <>
                  <img
                    src={selectedRecipe.images[activeRecipeImageIdx]}
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover transition-all duration-500"
                  />
                  {/* Controls */}
                  {selectedRecipe.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveRecipeImageIdx(prev => (prev > 0 ? prev - 1 : selectedRecipe.images!.length - 1));
                        }}
                        className="absolute left-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover/slider:opacity-100 active:scale-90"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveRecipeImageIdx(prev => (prev < selectedRecipe.images!.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover/slider:opacity-100 active:scale-90"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      {/* dots */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-3 py-1 rounded-full z-10">
                        {selectedRecipe.images.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRecipeImageIdx(dotIdx);
                            }}
                            className={`w-2 h-2 rounded-full transition-all ${
                              activeRecipeImageIdx === dotIdx ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                  <ChefHat className="w-16 h-16 animate-bounce" />
                  <span className="text-xs font-semibold tracking-wider uppercase">TasteGram Premium Cuisine</span>
                </div>
              )}
            </div>

            <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed bg-[var(--bg-tertiary)]/40 p-4 rounded-xl border border-[var(--border-color)]/20">{selectedRecipe.description}</p>

            {/* Serving Multiplier (Phase 1 React State) */}
            <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-color)]">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Servings Scaler</span>
                <span className="text-xs text-[var(--text-muted)]">Adjust ingredient portions dynamically</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMultiplier(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                >
                  -
                </button>
                <span className="text-lg font-black text-[var(--text-primary)]">{selectedRecipe.servings * multiplier}</span>
                <button
                  onClick={() => setMultiplier(prev => prev + 1)}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Split Section: Ingredients & Macros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ingredients */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-primary)]">Ingredients</h4>
                <ul className="flex flex-col gap-2">
                  {selectedRecipe.ingredients && selectedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm flex justify-between items-center border-b border-[var(--border-color)]/30 pb-2">
                      <span className="text-[var(--text-secondary)] font-medium">{ing.name}</span>
                      <span className="text-[var(--text-primary)] font-bold">{Math.round(ing.amount * multiplier * 100) / 100} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Macros */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-emerald)]">Nutrition Profile</h4>
                <div className="glass-panel p-4 border border-[var(--border-color)] rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">Calories</span>
                    <span className="text-[var(--text-primary)] font-black text-lg">{selectedRecipe.calories * multiplier} kcal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                    <div className="flex flex-col p-2 bg-[var(--bg-primary)] rounded-lg">
                      <span className="text-[var(--text-muted)]">Protein</span>
                      <span className="font-extrabold text-[var(--text-primary)] mt-1">{Math.round(selectedRecipe.protein * multiplier * 10) / 10}g</span>
                    </div>
                    <div className="flex flex-col p-2 bg-[var(--bg-primary)] rounded-lg">
                      <span className="text-[var(--text-muted)]">Carbs</span>
                      <span className="font-extrabold text-[var(--text-primary)] mt-1">{Math.round(selectedRecipe.carbs * multiplier * 10) / 10}g</span>
                    </div>
                    <div className="flex flex-col p-2 bg-[var(--bg-primary)] rounded-lg">
                      <span className="text-[var(--text-muted)]">Fat</span>
                      <span className="font-extrabold text-[var(--text-primary)] mt-1">{Math.round(selectedRecipe.fat * multiplier * 10) / 10}g</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-amber)]">Preparation Steps</h4>
              <ol className="flex flex-col gap-3">
                {selectedRecipe.instructions && selectedRecipe.instructions.map((step, idx) => (
                  <li key={idx} className="text-sm text-[var(--text-secondary)] flex gap-3.5 items-start">
                    <span className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--accent-amber)] font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="mt-0.5 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Log Actions */}
            <div className="flex gap-4 border-t border-[var(--border-color)] pt-6 mt-4">
              <button
                onClick={() => handleCook(selectedRecipe.id)}
                className="flex-1 py-3 bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Cooked This
              </button>
              <button
                onClick={(e) => { handleLike(selectedRecipe.id, e); setSelectedRecipe(null); }}
                className="py-3 px-6 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-red-900/50 hover:bg-red-950/20 text-[var(--text-secondary)] hover:text-red-400 font-semibold rounded-xl text-sm transition-all"
              >
                Favorite
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Recipe Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Recipe Catalog"
      >
        <form onSubmit={handleCreateRecipe} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Recipe Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Garlic Herb Salmon"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A quick, pan-seared salmon fillet glazed in garlic and butter..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm resize-none"
              required
            />
          </div>

          {/* Times and Servings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Prep Time (min)</label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Cook Time (min)</label>
              <input
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Base Servings</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm"
                required
              />
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Calories</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Diet Tags (comma separated)</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. keto, gluten-free, healthy"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
            />
          </div>

          {/* Multiple Photo URLs */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Recipe Photos (URLs)</label>
              <button
                type="button"
                onClick={handleAddImageRow}
                className="text-[var(--accent-primary)] hover:underline text-xs font-bold"
              >
                + Add Photo
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
              {images.map((img, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={img}
                    onChange={(e) => handleImageChange(idx, e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-xs"
                  />
                  {images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImageRow(idx)}
                      className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1 border border-red-500/20 hover:border-red-500/50 rounded-lg transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Ingredients Section */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Ingredients</label>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="text-[var(--accent-primary)] hover:underline text-xs font-bold"
              >
                + Add row
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(idx, "name", e.target.value)}
                    placeholder="Ingredient name"
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
                  />
                  <input
                    type="number"
                    value={ing.amount}
                    onChange={(e) => handleIngredientChange(idx, "amount", Number(e.target.value))}
                    className="w-20 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(idx, "unit", e.target.value)}
                    placeholder="g / tbsp"
                    className="w-20 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Instructions Section */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Preparation Steps</label>
              <button
                type="button"
                onClick={handleAddInstructionRow}
                className="text-[var(--accent-primary)] hover:underline text-xs font-bold"
              >
                + Add step
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
              {instructions.map((step, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-xs text-[var(--text-muted)] font-bold">{idx + 1}.</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleInstructionChange(idx, e.target.value)}
                    placeholder="Describe step..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[var(--accent-primary-glow)] flex items-center justify-center gap-2 mt-4"
          >
            Publish Recipe
          </button>
        </form>
      </Modal>
    </div>
  );
};
export default RecipeExplorer;
