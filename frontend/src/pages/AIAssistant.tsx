import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import { 
  Sparkles, 
  Plus, 
  Eye, 
  EyeOff, 
  Apple,
  ChefHat
} from "lucide-react";

export const AIAssistant: React.FC = () => {
  const { apiFetch } = useAuth();
  
  // Tab states: 'generator' | 'analyzer' | 'suggester' | 'planner'
  const [activeTab, setActiveTab] = useState<string>("generator");
  
  // Prompt visualizer toggle
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);
  
  // AI Generator States
  const [generatorPrompt, setGeneratorPrompt] = useState<string>("chocolate, avocado, almond milk");
  const [systemPrompt, setSystemPrompt] = useState<string>(
    "You are a Michelin-star pastry chef specializing in keto desserts. You must return exactly 3 distinct recipe options in structured JSON format matching this exact schema:\n" +
    "{\n" +
    "  \"recipes\": [\n" +
    "    {\n" +
    "      \"title\": \"Recipe Title (string)\",\n" +
    "      \"description\": \"Recipe Description (string)\",\n" +
    "      \"ingredients\": [\n" +
    "        {\"name\": \"ingredient name\", \"amount\": 1.5, \"unit\": \"cup/tbsp/g\"}\n" +
    "      ],\n" +
    "      \"instructions\": [\n" +
    "        \"Step 1 instruction description\",\n" +
    "        \"Step 2 instruction description\"\n" +
    "      ],\n" +
    "      \"prep_time\": 10,\n" +
    "      \"cook_time\": 15,\n" +
    "      \"servings\": 2,\n" +
    "      \"calories\": 300,\n" +
    "      \"protein\": 10.0,\n" +
    "      \"carbs\": 20.0,\n" +
    "      \"fat\": 15.0,\n" +
    "      \"tags\": [\"keto\", \"dessert\"]\n" +
    "    }\n" +
    "  ]\n" +
    "}\n" +
    "CRITICAL RULES:\n" +
    "1. All numbers must be valid JSON numeric types (integers or floats). NEVER output fractions like 1/2 or 1/4; instead, use decimal representations like 0.5 or 0.25.\n" +
    "2. Do NOT wrap numbers in quotes.\n" +
    "3. Ensure the output is valid, parsable JSON."
  );
  const [genLoading, setGenLoading] = useState<boolean>(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<any[]>([]);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number>(0);

  // AI Nutrition States
  const [nutritionText, setNutritionText] = useState<string>("I had 2 slices of white bread toast with 2 tablespoons of peanut butter and a banana.");
  const [nutriLoading, setNutriLoading] = useState<boolean>(false);
  const [nutritionResult, setNutritionResult] = useState<any | null>(null);

  // AI Flavor States
  const [baseIngredients, setBaseIngredients] = useState<string>("chicken, garlic");
  const [suggestLoading, setSuggestLoading] = useState<boolean>(false);
  const [suggestedFlavors, setSuggestedFlavors] = useState<string[]>([]);

  // AI Planner States
  const [targetCalories, setTargetCalories] = useState<number>(2000);
  const [dietPref, setDietPref] = useState<string>("balanced");
  const [planLoading, setPlanLoading] = useState<boolean>(false);
  const [aiMealPlan, setAiMealPlan] = useState<any | null>(null);

  const handleGenerateRecipe = async () => {
    if (!generatorPrompt.trim()) return;
    setGenLoading(true);
    setGeneratedRecipes([]);
    setSelectedRecipeIndex(0);
    try {
      const data = await apiFetch("/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generatorPrompt,
          system_prompt: systemPrompt
        })
      });
      setGeneratedRecipes(data.recipes || []);
      setSelectedRecipeIndex(0);
      toast.success("AI Recipes generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate recipe.");
    } finally {
      setGenLoading(false);
    }
  };

  const handleSaveToCatalog = async () => {
    const activeRecipe = generatedRecipes[selectedRecipeIndex];
    if (!activeRecipe) return;
    try {
      await apiFetch("/recipes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeRecipe)
      });
      toast.success("Saved! Recipe is now active in the main catalog.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save recipe");
    }
  };

  const handleAnalyzeNutrition = async () => {
    if (!nutritionText.trim()) return;
    setNutriLoading(true);
    setNutritionResult(null);
    try {
      const data = await apiFetch("/ai/analyze-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_text: nutritionText })
      });
      setNutritionResult(data);
      toast.success("Nutrition analysis complete!");
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze nutrition");
    } finally {
      setNutriLoading(false);
    }
  };

  const handleSuggestFlavors = async () => {
    if (!baseIngredients.trim()) return;
    setSuggestLoading(true);
    setSuggestedFlavors([]);
    try {
      const ingList = baseIngredients.split(",").map(i => i.trim()).filter(i => i !== "");
      const data = await apiFetch("/ai/suggest-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_ingredients: ingList })
      });
      setSuggestedFlavors(data.suggestions || []);
      toast.success("Flavor suggestions loaded.");
    } catch (err: any) {
      toast.error(err.message || "Failed to retrieve suggestions");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleGenerateAIPlanner = async () => {
    setPlanLoading(true);
    setAiMealPlan(null);
    try {
      const data = await apiFetch("/ai/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_calories: targetCalories,
          diet_preference: dietPref
        })
      });
      setAiMealPlan(data);
      toast.success("AI Daily Meal Plan constructed!");
    } catch (err: any) {
      toast.error(err.message || "Failed to construct meal plan");
    } finally {
      setPlanLoading(false);
    }
  };

  const tabs = [
    { id: "generator", label: "Recipe Generator", desc: "Build structured recipes from ingredients" },
    { id: "analyzer", label: "Nutrition Analyzer", desc: "Parse plain text nutritional breakdowns" },
    { id: "suggester", label: "Flavor Suggester", desc: "Identify pairing ingredients dynamically" },
    { id: "planner", label: "Menu Planner", desc: "Formulate daily meal plans matching targets" }
  ];

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">AI Innovation Lab</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Prompt engineering sandboxes, structured outputs, and LLM orchestration</p>
        </div>
        <button
          onClick={() => setShowPromptDetails(!showPromptDetails)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-semibold rounded-xl text-[var(--text-primary)] transition-colors"
        >
          {showPromptDetails ? <EyeOff className="w-4 h-4 text-[var(--accent-amber)]" /> : <Eye className="w-4 h-4 text-[var(--accent-amber)]" />}
          {showPromptDetails ? "Hide Prompt Details" : "Show Prompt Details"}
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`glass-panel p-4 border text-left transition-all duration-300 hover:scale-102 hover:border-[var(--accent-primary)]/40 ${
              activeTab === tab.id
                ? "border-[var(--accent-primary)] shadow-[var(--accent-primary-glow)] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)]"
                : "border-[var(--border-color)] hover:shadow-lg"
            }`}
          >
            <span className={`text-sm font-extrabold leading-none ${activeTab === tab.id ? "text-[var(--accent-primary)]" : "text-white"}`}>
              {tab.label}
            </span>
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-snug">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Prompt Engineer Details (Educational pane explaining Phase 5 concept) */}
      {showPromptDetails && (
        <div className="glass-panel p-6 border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/5 rounded-2xl flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent-amber)]" />
            <h4 className="text-sm font-bold text-[var(--accent-amber)] uppercase tracking-wider">How Context Injection works here</h4>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            When you send a prompt, RecipeHUB automatically scans your past interaction history. If you have "liked" or "cooked" vegetarian recipes, it dynamically appends a preferences object: 
            <code className="mx-1 px-1.5 py-0.5 bg-[var(--bg-primary)] rounded text-[var(--accent-emerald)] font-mono">Context: The user has shown a preference for vegetarian recipes.</code>
            to the prompt body. It also sets up a system controller prompt and instructs the model to enforce a strict JSON output.
          </p>
        </div>
      )}

      {/* Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Inputs */}
        <div className="glass-panel p-6 border border-[var(--border-color)] lg:col-span-5 flex flex-col gap-5">
          {activeTab === "generator" && (
            <>
              <h3 className="text-md font-bold text-[var(--text-primary)]">Generator Sandbox</h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Custom System Prompt Override</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-xs resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">User Inputs (Ingredients / Desires)</label>
                <input
                  type="text"
                  value={generatorPrompt}
                  onChange={(e) => setGeneratorPrompt(e.target.value)}
                  placeholder="e.g. avocado, cocoa powder, honey"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
                />
              </div>

              <button
                onClick={handleGenerateRecipe}
                disabled={genLoading}
                className="py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-purple-900/25 flex items-center justify-center gap-2"
              >
                {genLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate Recipe
                  </>
                )}
              </button>
            </>
          )}

          {activeTab === "analyzer" && (
            <>
              <h3 className="text-md font-bold text-[var(--text-primary)]">Plain-Text Nutrition Scanner</h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Describe what you ate or a recipe instructions</label>
                <textarea
                  value={nutritionText}
                  onChange={(e) => setNutritionText(e.target.value)}
                  rows={6}
                  placeholder="e.g. I had two scrambled eggs cooked in a tablespoon of olive oil, alongside half a cup of boiled spinach."
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm resize-none"
                />
              </div>

              <button
                onClick={handleAnalyzeNutrition}
                disabled={nutriLoading}
                className="py-3 bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/25 flex items-center justify-center gap-2"
              >
                {nutriLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Apple className="w-4 h-4" /> Analyze Nutrition
                  </>
                )}
              </button>
            </>
          )}

          {activeTab === "suggester" && (
            <>
              <h3 className="text-md font-bold text-[var(--text-primary)]">Flavor Combination Finder</h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Core Ingredients (comma separated)</label>
                <input
                  type="text"
                  value={baseIngredients}
                  onChange={(e) => setBaseIngredients(e.target.value)}
                  placeholder="e.g. chocolate, vanilla"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
                />
              </div>

              <button
                onClick={handleSuggestFlavors}
                disabled={suggestLoading}
                className="py-3 bg-[var(--accent-amber)] hover:bg-[var(--accent-amber)]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-900/25 flex items-center justify-center gap-2"
              >
                {suggestLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4" /> Fetch Pairings
                  </>
                )}
              </button>
            </>
          )}

          {activeTab === "planner" && (
            <>
              <h3 className="text-md font-bold text-[var(--text-primary)]">Calorie-Diet Menu Configurator</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Daily Calories</label>
                  <input
                    type="number"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Diet Type</label>
                  <select
                    value={dietPref}
                    onChange={(e) => setDietPref(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="vegan">Vegan</option>
                    <option value="keto">Keto</option>
                    <option value="low-carb">Low Carb</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateAIPlanner}
                disabled={planLoading}
                className="py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-purple-900/25 flex items-center justify-center gap-2"
              >
                {planLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Construct Daily Menu
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Right Side: Structured JSON Result Outputs */}
        <div className="glass-panel p-6 border border-[var(--border-color)] lg:col-span-7 flex flex-col gap-5 min-h-[400px]">
          <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
            <h3 className="text-md font-bold text-[var(--text-primary)]">Execution Output</h3>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] bg-[var(--bg-primary)] px-2.5 py-1 rounded-md border border-[var(--border-color)]">Structured Output</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
             {/* Generator Output */}
            {activeTab === "generator" && (
              <>
                {generatedRecipes.length > 0 ? (
                  <div className="flex flex-col gap-5 animate-fade-in text-sm text-gray-300">
                    {/* Options Tabs Selector */}
                    <div className="flex border-b border-[var(--border-color)] pb-2 mb-2 gap-2">
                      {generatedRecipes.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedRecipeIndex(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selectedRecipeIndex === idx
                              ? "bg-[var(--accent-primary)] text-white"
                              : "bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                          }`}
                        >
                          Option {idx + 1}
                        </button>
                      ))}
                    </div>

                    {/* Display active recipe */}
                    {(() => {
                      const activeRecipe = generatedRecipes[selectedRecipeIndex];
                      if (!activeRecipe) return null;
                      return (
                        <div className="flex flex-col gap-5 animate-fade-in text-sm text-gray-300">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className="text-lg font-black text-[var(--text-primary)]">{activeRecipe.title}</span>
                              <span className="text-xs text-[var(--text-muted)] mt-1">{activeRecipe.description}</span>
                            </div>
                            <button
                              onClick={handleSaveToCatalog}
                              className="px-4 py-2 bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/90 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/20"
                            >
                              <Plus className="w-3.5 h-3.5" /> Save to Catalog
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-[var(--accent-primary)] uppercase">Ingredients</span>
                              <ul className="list-disc list-inside flex flex-col gap-1 text-xs">
                                {activeRecipe.ingredients && activeRecipe.ingredients.map((ing: any, i: number) => {
                                  if (typeof ing === "string") return <li key={i}>{ing}</li>;
                                  if (typeof ing === "object" && ing !== null) {
                                    const amt = ing.amount !== undefined ? ing.amount : ing.quantity;
                                    return <li key={i}>{amt} {ing.unit} of {ing.name}</li>;
                                  }
                                  return null;
                                })}
                              </ul>
                            </div>

                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-[var(--accent-emerald)] uppercase">Nutrition Details</span>
                              <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex flex-col gap-1 text-xs">
                                <div>Calories: <span className="font-bold text-[var(--text-primary)]">{activeRecipe.calories} kcal</span></div>
                                <div>Protein: <span className="font-bold text-[var(--text-primary)]">{activeRecipe.protein}g</span></div>
                                <div>Carbs: <span className="font-bold text-[var(--text-primary)]">{activeRecipe.carbs}g</span></div>
                                <div>Fat: <span className="font-bold text-[var(--text-primary)]">{activeRecipe.fat}g</span></div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-[var(--accent-amber)] uppercase">Instructions</span>
                            <ol className="flex flex-col gap-1 text-xs">
                              {activeRecipe.instructions && activeRecipe.instructions.map((step: any, i: number) => {
                                let stepText = "";
                                if (typeof step === "string") {
                                  stepText = step;
                                } else if (typeof step === "object" && step !== null) {
                                  stepText = step.action || step.instruction || step.step || JSON.stringify(step);
                                }
                                return (
                                  <li key={i} className="flex gap-2 items-start">
                                    <span className="font-black text-[var(--accent-amber)]">{i + 1}.</span>
                                    <span>{stepText}</span>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-center text-[var(--text-muted)] text-sm font-semibold">Enter ingredients on the left and click generate.</p>
                )}
              </>
            )}

            {/* Analyzer Output */}
            {activeTab === "analyzer" && (
              <>
                {nutritionResult ? (
                  <div className="flex flex-col gap-6 animate-fade-in text-sm text-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Nutrition Breakdown</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[var(--text-muted)]">Health Score:</span>
                        <span className={`text-md font-black px-2.5 py-0.5 rounded-lg text-white ${nutritionResult.score > 70 ? "bg-[var(--accent-emerald)]" : "bg-[var(--accent-amber)]"}`}>
                          {nutritionResult.score}/100
                        </span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold">CALORIES</span>
                        <p className="text-lg font-black text-[var(--text-primary)] mt-1">{nutritionResult.calories}</p>
                      </div>
                      <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold">PROTEIN</span>
                        <p className="text-lg font-black text-[var(--text-primary)] mt-1">{nutritionResult.protein}g</p>
                      </div>
                      <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold">CARBS</span>
                        <p className="text-lg font-black text-[var(--text-primary)] mt-1">{nutritionResult.carbs}g</p>
                      </div>
                      <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold">FAT</span>
                        <p className="text-lg font-black text-[var(--text-primary)] mt-1">{nutritionResult.fat}g</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-[var(--accent-primary)] uppercase">Summary</span>
                      <p className="text-xs text-gray-300 leading-relaxed bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)]">{nutritionResult.breakdown}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-[var(--accent-amber)] uppercase">Smart Swaps Suggestions</span>
                      <ul className="flex flex-col gap-1 text-xs list-disc list-inside">
                        {nutritionResult.healthy_swaps && nutritionResult.healthy_swaps.map((swap: any, i: number) => {
                          const swapText = typeof swap === "object" && swap !== null ? JSON.stringify(swap) : swap;
                          return <li key={i} className="text-gray-300">{swapText}</li>;
                        })}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-[var(--text-muted)] text-sm font-semibold">Paste recipe/meal text description on the left and scan.</p>
                )}
              </>
            )}

            {/* Flavor Output */}
            {activeTab === "suggester" && (
              <>
                {suggestedFlavors.length > 0 ? (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Ingredients that pair well</span>
                    <div className="grid grid-cols-2 gap-3">
                      {suggestedFlavors.map((flavor, idx) => (
                        <div key={idx} className="p-3.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm font-bold flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-amber)]"></span>
                          {flavor}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-[var(--text-muted)] text-sm font-semibold">Input ingredients on the left and find pairings.</p>
                )}
              </>
            )}

            {/* Menu Planner Output */}
            {activeTab === "planner" && (
              <>
                {aiMealPlan ? (
                  <div className="flex flex-col gap-5 animate-fade-in text-sm text-gray-300">
                    <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">AI Formulated Daily Menu</span>
                      <span className="text-xs text-[var(--accent-emerald)] font-bold">{aiMealPlan.total_calories} kcal total</span>
                    </div>

                    {/* Meal items */}
                    <div className="flex flex-col gap-3">
                      {["breakfast", "lunch", "dinner"].map((m) => {
                        const item = aiMealPlan[m];
                        return (
                          <div key={m} className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex justify-between items-center">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">{m}</span>
                              <span className="text-sm font-bold text-[var(--text-primary)]">{item.title}</span>
                            </div>
                            <span className="text-xs text-[var(--accent-primary)] font-bold">{item.calories} kcal</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total macros */}
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-color)] grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold">PROTEIN</div>
                        <div className="font-extrabold text-[var(--text-primary)] mt-1">{Math.round(aiMealPlan.protein)}g</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold">CARBS</div>
                        <div className="font-extrabold text-[var(--text-primary)] mt-1">{Math.round(aiMealPlan.carbs)}g</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold">FAT</div>
                        <div className="font-extrabold text-[var(--text-primary)] mt-1">{Math.round(aiMealPlan.fat)}g</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-[var(--text-muted)] text-sm font-semibold">Select calories and click construct menu.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AIAssistant;
