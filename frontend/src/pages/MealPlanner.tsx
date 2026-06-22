import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { 
  Plus, 
  Trash2, 
  Flame, 
  Calendar as CalendarIcon, 
  Search,
  ChevronRight
} from "lucide-react";

interface Recipe {
  id: number;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealPlanEntry {
  id: number;
  recipe_id: number;
  meal_date: string;
  meal_type: string;
  recipe: Recipe;
}

export const MealPlanner: React.FC = () => {
  const { apiFetch } = useAuth();
  const [plans, setPlans] = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Scheduling state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<string>("");
  const [recipeSearch, setRecipeSearch] = useState<string>("");
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);

  // Generate list of next 7 days
  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const isoDate = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      const month = d.toLocaleDateString("en-US", { month: "short" });
      days.push({ isoDate, label: `${weekday}, ${month} ${dayNum}` });
    }
    return days;
  };

  const next7Days = getNext7Days();

  const fetchMealPlans = async () => {
    try {
      const data = await apiFetch(`/meal-plans/?start_date=${next7Days[0].isoDate}&end_date=${next7Days[6].isoDate}`);
      setPlans(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load meal plans.");
    }
  };

  const fetchRecipesList = async () => {
    try {
      const data = await apiFetch("/recipes/");
      setRecipes(data);
      setFilteredRecipes(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchMealPlans();
      await fetchRecipesList();
    };
    init();
  }, []);

  // Filter recipes inside picker
  useEffect(() => {
    const filtered = recipes.filter(r => 
      r.title.toLowerCase().includes(recipeSearch.toLowerCase())
    );
    setFilteredRecipes(filtered);
  }, [recipeSearch, recipes]);

  const handleOpenAddModal = (dateStr: string, mealType: string) => {
    setSelectedDate(dateStr);
    setSelectedMealType(mealType);
    setRecipeSearch("");
    setIsAddOpen(true);
  };

  const handleAddMeal = async (recipeId: number) => {
    try {
      await apiFetch("/meal-plans/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id: recipeId,
          meal_date: selectedDate,
          meal_type: selectedMealType
        })
      });
      
      toast.success("Meal scheduled successfully!");
      setIsAddOpen(false);
      
      // Update plan list
      await fetchMealPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule meal");
    }
  };

  const handleDeleteMeal = async (planId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/meal-plans/${planId}`, {
        method: "DELETE"
      });
      toast.info("Meal removed from schedule.");
      await fetchMealPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete meal");
    }
  };

  // Group plans by date and type for fast lookup
  const getPlanForSlot = (dateStr: string, type: string) => {
    return plans.find(p => p.meal_date === dateStr && p.meal_type === type);
  };

  // Calculate day totals
  const getDayNutrientTotals = (dateStr: string) => {
    const dayPlans = plans.filter(p => p.meal_date === dateStr);
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    dayPlans.forEach(p => {
      if (p.recipe) {
        calories += p.recipe.calories || 0;
        protein += p.recipe.protein || 0;
        carbs += p.recipe.carbs || 0;
        fat += p.recipe.fat || 0;
      }
    });

    return { calories, protein, carbs, fat };
  };

  const mealTypes = [
    { key: "breakfast", label: "Breakfast" },
    { key: "lunch", label: "Lunch" },
    { key: "dinner", label: "Dinner" }
  ];

  if (loading) {
    return (
      <div className="p-8 flex flex-col gap-6 w-full animate-pulse">
        <div className="h-10 w-48 bg-[var(--bg-tertiary)] rounded-xl"></div>
        <div className="h-96 w-full bg-[var(--bg-secondary)] rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 w-full animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)]">Interactive Meal Planner</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Design your week, track macros, and schedule recipes</p>
      </div>

      {/* Grid of days */}
      <div className="flex flex-col gap-3">
        {next7Days.map((day) => {
          const totals = getDayNutrientTotals(day.isoDate);
          return (
            <div 
              key={day.isoDate} 
              className="glass-panel p-3 md:p-4 border border-[var(--border-color)] flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center hover-card"
            >
              {/* Left column: Date */}
              <div className="flex flex-col gap-1 w-full lg:w-44 shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border-color)] pb-3 lg:pb-0 lg:pr-6">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">{/* icon */}<CalendarIcon className="w-5 h-5 text-[var(--accent-primary)]" />
                  <span className="font-extrabold text-md">{day.label}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)] font-medium mt-1">Weekly Schedule</span>
              </div>

              {/* Middle column: Meal slots */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-grow w-full">
                {mealTypes.map((meal) => {
                  const plan = getPlanForSlot(day.isoDate, meal.key);
                  return (
                    <div 
                      key={meal.key}
                      className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex flex-col justify-between gap-2 min-h-[80px] relative"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">{meal.label}</span>
                        {plan && (
                          <button
                            onClick={(e) => handleDeleteMeal(plan.id, e)}
                            className="text-[var(--text-muted)] hover:text-[var(--accent-rose)] transition-colors p-0.5 rounded"
                            title="Remove meal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {plan ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[var(--text-primary)] line-clamp-1 leading-tight">{plan.recipe.title}</span>
                          <span className="text-xs text-[var(--accent-primary)] font-semibold mt-1 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-500" />
                            {plan.recipe.calories} kcal
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenAddModal(day.isoDate, meal.key)}
                          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold transition-colors mt-auto border border-dashed border-[var(--border-color)] px-3 py-2 rounded-lg hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)]/20"
                        >
                          <Plus className="w-3.5 h-3.5" /> Schedule Meal
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right column: Macro summaries */}
              <div className="w-full lg:w-44 shrink-0 bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-3 rounded-xl flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-bold border-b border-[var(--border-color)] pb-2 mb-1">
                  <span className="text-[var(--text-secondary)]">Day Total</span>
                  <span className="text-[var(--accent-emerald)]">{totals.calories} kcal</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center text-[var(--text-secondary)]">
                  <div className="flex flex-col">
                    <span className="text-[var(--text-muted)] font-bold">PRO</span>
                    <span className="font-extrabold text-[var(--text-primary)] mt-0.5">{Math.round(totals.protein * 10) / 10}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[var(--text-muted)] font-bold">CARB</span>
                    <span className="font-extrabold text-[var(--text-primary)] mt-0.5">{Math.round(totals.carbs * 10) / 10}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[var(--text-muted)] font-bold">FAT</span>
                    <span className="font-extrabold text-[var(--text-primary)] mt-0.5">{Math.round(totals.fat * 10) / 10}g</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Recipe Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={`Schedule Meal for ${selectedMealType.toUpperCase()}`}
      >
        <div className="flex flex-col gap-5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
              placeholder="Search catalog..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
            />
          </div>

          {/* Recipe List */}
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {filteredRecipes.length === 0 ? (
              <p className="text-sm text-center text-[var(--text-muted)] py-8 font-semibold">No recipes matching your search.</p>
            ) : (
              filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => handleAddMeal(recipe.id)}
                  className="flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)]/20 rounded-xl cursor-pointer transition-all duration-200"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--text-primary)] leading-snug">{recipe.title}</span>
                    <span className="text-xs text-[var(--text-muted)] mt-0.5">{recipe.calories} kcal | P:{recipe.protein}g | C:{recipe.carbs}g | F:{recipe.fat}g</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default MealPlanner;
