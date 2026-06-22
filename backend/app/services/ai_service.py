import json
import logging
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings
from app.schemas.recipe import RecipeCreate, IngredientSchema

logger = logging.getLogger("recipehub.ai")

class AIService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(AIService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        self.api_key = settings.AI_API_KEY
        self.is_mock = self.api_key in ["mock_key", "", None] or "insert_your_grok_key_here" in str(self.api_key)
        
        # Default fallback values from settings
        self.base_url = settings.AI_BASE_URL
        self.model = settings.AI_MODEL

        if self.is_mock:
            logger.info("AI Service initialized in MOCK mode.")
        else:
            key_str = str(self.api_key).strip()
            if key_str.startswith("gsk_"):
                self.base_url = "https://api.groq.com/openai/v1"
                if "llama" not in self.model.lower() and "mixtral" not in self.model.lower():
                    self.model = "llama-3.3-70b-versatile"
                logger.info(f"AI Service initialized in REAL mode with Auto-detected Groq config (Base URL: {self.base_url}, Model: {self.model}).")
            elif key_str.startswith("xai-"):
                self.base_url = "https://api.x.ai/v1"
                if "grok" not in self.model.lower():
                    self.model = "grok-2"
                logger.info(f"AI Service initialized in REAL mode with Auto-detected xAI Grok config (Base URL: {self.base_url}, Model: {self.model}).")
            elif key_str.startswith("sk-"):
                self.base_url = "https://api.openai.com/v1"
                if "gpt" not in self.model.lower():
                    self.model = "gpt-4o-mini"
                logger.info(f"AI Service initialized in REAL mode with Auto-detected OpenAI config (Base URL: {self.base_url}, Model: {self.model}).")
            else:
                logger.info(f"AI Service initialized in REAL mode (Base URL: {self.base_url}, Model: {self.model}).")

    async def generate_recipe(self, prompt: str, system_prompt: Optional[str] = None, context: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates a recipe based on ingredients or keywords.
        Demonstrates system prompts, user prompts, and context injection.
        """
        if self.is_mock:
            return self._mock_recipe_generation(prompt, context)

        # Build prompts
        default_system = (
            "You are a professional chef. You must return a single recipe in structured JSON format matching this exact schema:\n"
            "{\n"
            "  \"title\": \"Recipe Title (string)\",\n"
            "  \"description\": \"Recipe Description (string)\",\n"
            "  \"ingredients\": [\n"
            "    {\"name\": \"ingredient name (string)\", \"amount\": 1.5 (float), \"unit\": \"cup/tbsp/g/pcs (string)\"}\n"
            "  ],\n"
            "  \"instructions\": [\n"
            "    \"Step 1 instruction description (string)\",\n"
            "    \"Step 2 instruction description (string)\"\n"
            "  ],\n"
            "  \"prep_time\": 10 (integer, minutes),\n"
            "  \"cook_time\": 15 (integer, minutes),\n"
            "  \"servings\": 2 (integer),\n"
            "  \"calories\": 300 (integer),\n"
            "  \"protein\": 10.0 (float, grams),\n"
            "  \"carbs\": 20.0 (float, grams),\n"
            "  \"fat\": 15.0 (float, grams),\n"
            "  \"tags\": [\"tag1\", \"tag2\"]\n"
            "}\n"
            "CRITICAL RULES:\n"
            "1. All numbers must be valid JSON numeric types (integers or floats). NEVER output fractions like 1/2 or 1/4; instead, use decimal representations like 0.5 or 0.25.\n"
            "2. Do NOT wrap numbers in quotes.\n"
            "3. Ensure the output is valid, parsable JSON."
        )
        sys_msg = system_prompt or default_system
        
        user_msg = prompt
        if context:
            user_msg = f"Context about user preferences: {context}\n\nUser request: {prompt}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": sys_msg},
                {"role": "user", "content": user_msg}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.7
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url.rstrip('/')}/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                parsed_json = json.loads(content)
                return self._clean_generated_recipe(parsed_json)
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP status error calling Grok API: {e.response.text}. Falling back to mock generator.")
            return self._mock_recipe_generation(prompt, context)
        except Exception as e:
            logger.error(f"Error calling Grok API: {e}. Falling back to mock generator.")
            return self._mock_recipe_generation(prompt, context)

    async def analyze_nutrition(self, recipe_text: str) -> Dict[str, Any]:
        """
        Analyzes a text-based recipe description and returns nutrition info.
        """
        if self.is_mock:
            return self._mock_nutrition_analysis(recipe_text)

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system", 
                    "content": "Analyze the nutrition of the following recipe. Return a JSON object with keys: calories (int), protein (float), carbs (float), fat (float), breakdown (str), score (int, 1-100), and healthy_swaps (list of strings)."
                },
                {"role": "user", "content": recipe_text}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url.rstrip('/')}/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=20.0
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                parsed_json = json.loads(content)
                return self._clean_nutrition_analysis(parsed_json)
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP status error calling Grok API for nutrition: {e.response.text}. Falling back to mock.")
            return self._mock_nutrition_analysis(recipe_text)
        except Exception as e:
            logger.error(f"Error calling Grok API for nutrition: {e}. Falling back to mock.")
            return self._mock_nutrition_analysis(recipe_text)

    async def suggest_ingredients(self, base_ingredients: List[str]) -> List[str]:
        """
        Suggests matching ingredients.
        """
        if self.is_mock:
            return self._mock_ingredient_suggestions(base_ingredients)

        prompt = f"Suggest 5 ingredients that pair well with: {', '.join(base_ingredients)}. Return as a JSON array of strings under key 'suggestions'."
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a flavor scientist. You must return JSON in format: {'suggestions': ['item1', 'item2', ...]}"},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(f"{self.base_url.rstrip('/')}/chat/completions", json=payload, headers=headers, timeout=15.0)
                data = response.json()
                content = json.loads(data["choices"][0]["message"]["content"])
                return content.get("suggestions", [])
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP status error calling Grok API for suggestions: {e.response.text}")
            return self._mock_ingredient_suggestions(base_ingredients)
        except Exception as e:
            logger.error(f"Error calling Grok API for suggestions: {e}")
            return self._mock_ingredient_suggestions(base_ingredients)

    # --- MOCK IMPLEMENTATIONS ---
    
    def _mock_recipe_generation(self, prompt: str, context: Optional[str] = None) -> Dict[str, Any]:
        prompt_lower = prompt.lower()
        
        # Check context for preference adjustments
        is_vegan = "vegan" in prompt_lower or (context and "vegan" in context.lower())
        is_keto = "keto" in prompt_lower or (context and "keto" in context.lower())

        import re
        # Try to parse user inputs (split by commas, semicolons, "and", or newlines)
        user_items = [x.strip() for x in re.split(r'[,;]|\band\b|\n', prompt) if x.strip()]
        # Filter out common utility words
        filtered_items = []
        for x in user_items:
            # strip punctuation
            clean = re.sub(r'[^\w\s-]', '', x).strip()
            if not clean:
                continue
            clean_lower = clean.lower()
            if clean_lower in ["and", "with", "recipe", "please", "make", "generate", "keto", "vegan", "gluten-free", "healthy", "simple", "easy", "for", "me"]:
                continue
            filtered_items.append(clean)

        if not filtered_items:
            filtered_items = ["Chicken", "Spinach", "Garlic"] if not is_vegan else ["Tofu", "Spinach", "Garlic"]

        # Capitalize ingredients nicely
        user_ingredients = [x.title() for x in filtered_items]
        main_ing = user_ingredients[0]
        other_ings = user_ingredients[1:]

        # Recipe 1: Custom Saute/Stir-Fry
        r1_ingredients = []
        for ing in user_ingredients:
            r1_ingredients.append({
                "name": ing,
                "amount": 150.0 if any(u in ing.lower() for u in ["chicken", "tofu", "fish", "beef", "pork", "salmon", "meat"]) else 1.5,
                "unit": "g" if any(u in ing.lower() for u in ["chicken", "tofu", "fish", "beef", "pork", "salmon", "meat"]) else "cups" if any(u in ing.lower() for u in ["spinach", "lettuce", "greens", "kale"]) else "pcs"
            })
        if len(r1_ingredients) < 3:
            r1_ingredients.append({"name": "Garlic", "amount": 2.0, "unit": "cloves"})
            r1_ingredients.append({"name": "Olive Oil", "amount": 1.0, "unit": "tbsp"})

        r1 = {
            "title": f"AI Aromatic {main_ing} Stir-Fry" if other_ings else f"AI Pan-Seared {main_ing}",
            "description": f"A delightful, customized dish featuring fresh {', '.join(user_ingredients[:3])}.",
            "ingredients": r1_ingredients,
            "instructions": [
                f"Prepare and wash the ingredients, then slice the {main_ing.lower()} and other items.",
                "Heat olive oil (or butter) in a pan over medium heat.",
                f"Sauté the {main_ing.lower()} for 5-7 minutes until cooked through.",
                f"Add the remaining ingredients ({', '.join([x.lower() for x in other_ings[:3]])}) and cook for another 3 minutes.",
                "Season with salt, black pepper, and herbs to taste.",
                "Serve hot, garnished with fresh herbs."
            ],
            "prep_time": 10,
            "cook_time": 12,
            "servings": 2,
            "calories": 340 if is_keto else 290,
            "protein": 24.0 if "chicken" in prompt_lower or "beef" in prompt_lower or "tofu" in prompt_lower else 12.0,
            "carbs": 8.0 if is_keto else 18.0,
            "fat": 20.0 if is_keto else 12.0,
            "tags": ["saute", "quick"] + (["vegan"] if is_vegan else []) + (["keto"] if is_keto else [])
        }

        # Recipe 2: Custom Warm Salad or Nourish Bowl
        r2_ingredients = []
        for ing in user_ingredients:
            r2_ingredients.append({
                "name": ing,
                "amount": 1.0 if any(u in ing.lower() for u in ["avocado", "tomato", "onion", "lemon"]) else 100.0,
                "unit": "piece" if any(u in ing.lower() for u in ["avocado", "tomato", "onion", "lemon"]) else "g"
            })
        r2_ingredients.append({"name": "Mixed Greens", "amount": 100.0, "unit": "g"})
        r2_ingredients.append({"name": "Vinaigrette Dressing", "amount": 2.0, "unit": "tbsp"})

        r2 = {
            "title": f"AI Dynamic {main_ing} Salad Bowl",
            "description": f"A wholesome, nutrient-dense bowl showcasing roasted {main_ing} with fresh accompaniments.",
            "ingredients": r2_ingredients,
            "instructions": [
                f"Chop the {main_ing.lower()} into bite-sized cubes and season.",
                f"If cooking is required, roast or pan-sear the {main_ing.lower()} for 10 minutes.",
                f"Assemble the salad base using mixed greens and arrange the {', '.join([x.lower() for x in user_ingredients])} on top.",
                "Drizzle with vinaigrette dressing and toss gently.",
                "Serve chilled or at room temperature."
            ],
            "prep_time": 15,
            "cook_time": 10,
            "servings": 2,
            "calories": 280,
            "protein": 14.0,
            "carbs": 12.0,
            "fat": 19.0,
            "tags": ["salad", "healthy"] + (["vegan"] if is_vegan else []) + (["keto"] if is_keto else [])
        }

        # Recipe 3: Custom Soup or Simmered Stew
        r3_ingredients = []
        for ing in user_ingredients:
            r3_ingredients.append({"name": ing, "amount": 1.0, "unit": "cup" if "spinach" in ing.lower() else "pcs"})
        r3_ingredients.append({"name": "Vegetable Broth", "amount": 400.0, "unit": "ml"})
        r3_ingredients.append({"name": "Coconut Milk" if is_vegan or is_keto else "Heavy Cream", "amount": 100.0, "unit": "ml"})

        r3 = {
            "title": f"AI Spicy Aromatic {main_ing} Stew",
            "description": f"A rich and comforting stew featuring slow-simmered {main_ing.lower()} and local herbs.",
            "ingredients": r3_ingredients,
            "instructions": [
                f"Sauté minced garlic, onion, and {main_ing.lower()} in a deep pot.",
                "Pour in the vegetable broth and bring to a simmer.",
                f"Add the remaining ingredients ({', '.join([x.lower() for x in other_ings[:3]])}) and cook for 15 minutes.",
                "Stir in the coconut milk or heavy cream in the last 2 minutes.",
                "Ladle into bowls and serve with crusty bread or side of rice."
            ],
            "prep_time": 10,
            "cook_time": 15,
            "servings": 3,
            "calories": 240,
            "protein": 10.0,
            "carbs": 15.0,
            "fat": 14.0,
            "tags": ["stew", "comfort-food"] + (["vegan"] if is_vegan else []) + (["keto"] if is_keto else [])
        }

        return {
            "recipes": [r1, r2, r3]
        }

    def _mock_nutrition_analysis(self, recipe_text: str) -> Dict[str, Any]:
        text_lower = recipe_text.lower()
        
        # Determine calorie bases
        calories = 150
        protein = 5.0
        carbs = 10.0
        fat = 4.0
        swaps = []
        score = 80

        # Adjust based on keywords in recipe text
        if "chicken" in text_lower or "beef" in text_lower or "pork" in text_lower or "meat" in text_lower:
            calories += 200
            protein += 25.0
            fat += 8.0
        if "tofu" in text_lower or "beans" in text_lower or "chickpeas" in text_lower:
            calories += 120
            protein += 12.0
            carbs += 15.0
        if "cheese" in text_lower or "butter" in text_lower or "cream" in text_lower:
            calories += 150
            fat += 14.0
            swaps.append("Replace heavy butter/cream with low-fat yogurt or plant-based spread to reduce saturated fats.")
            score -= 10
        if "sugar" in text_lower or "honey" in text_lower or "chocolate" in text_lower:
            calories += 180
            carbs += 30.0
            swaps.append("Substitute refined sugars with stevia, erythritol, or fresh fruit puree.")
            score -= 20
        if "spinach" in text_lower or "kale" in text_lower or "broccoli" in text_lower or "greens" in text_lower:
            calories += 20
            protein += 2.0
            carbs += 4.0
            score += 5

        # Cap score between 0 and 100
        score = max(10, min(100, score))
        
        # Add basic default swaps if empty
        if not swaps:
            swaps = [
                "Incorporate more green leafy vegetables to increase fiber.",
                "Ensure lean protein sources are preferred to minimize saturated fats."
            ]

        breakdown = f"Calculated nutrition breakdown dynamically for: '{recipe_text[:35]}...'. "
        if score > 75:
            breakdown += "This meal offers a balanced distribution of macronutrients with high nutritional density."
        else:
            breakdown += "This meal is moderately high in calorie-dense macro elements. Consider the suggested swaps."

        return {
            "calories": int(calories),
            "protein": float(round(protein, 1)),
            "carbs": float(round(carbs, 1)),
            "fat": float(round(fat, 1)),
            "breakdown": breakdown,
            "score": int(score),
            "healthy_swaps": swaps
        }

    def _mock_ingredient_suggestions(self, base_ingredients: List[str]) -> List[str]:
        bases = [b.strip().lower() for b in base_ingredients if b.strip()]
        suggestions = []
        
        # Mapping base categories to good pairing suggestions
        pairings = {
            "chicken": ["Garlic", "Rosemary", "Thyme", "Lemon Juice", "Mushrooms"],
            "beef": ["Red Wine", "Black Pepper", "Onions", "Soy Sauce", "Worcestershire"],
            "pork": ["Apples", "Sage", "Mustard", "Honey", "Garlic"],
            "salmon": ["Dill", "Lemon Juice", "Butter", "Capers", "Asparagus"],
            "fish": ["Lemon", "Dill", "White Wine", "Garlic", "Parsley"],
            "tofu": ["Soy Sauce", "Sesame Oil", "Ginger", "Garlic", "Green Onions"],
            "spinach": ["Feta Cheese", "Garlic", "Nutmeg", "Olive Oil", "Pine Nuts"],
            "pasta": ["Basil", "Parmesan", "Tomato Sauce", "Garlic", "Olive Oil"],
            "tomato": ["Basil", "Mozzarella", "Balsamic Glaze", "Olive Oil", "Garlic"],
            "chocolate": ["Vanilla Extract", "Sea Salt", "Raspberry", "Espresso Powder", "Mint"],
            "avocado": ["Cilantro", "Lime Juice", "Red Onion", "Tomato", "Jalapeno"],
            "potato": ["Butter", "Chives", "Sour Cream", "Garlic", "Bacon"],
            "egg": ["Chives", "Cheddar Cheese", "Black Pepper", "Butter", "Spinach"],
            "rice": ["Soy Sauce", "Sesame Oil", "Garlic", "Ginger", "Green Peas"]
        }

        # Check matching categories
        for base in bases:
            matched = False
            for key, items in pairings.items():
                if key in base:
                    for item in items:
                        if item not in suggestions and item.lower() not in bases:
                            suggestions.append(item)
                    matched = True
            
            # If no matches, add a generic dynamic pairing based on the word itself
            if not matched:
                defaults = ["Garlic", "Olive Oil", "Lemon Juice", "Black Pepper", "Onions"]
                for item in defaults:
                    if item not in suggestions and item.lower() not in bases:
                        suggestions.append(item)

        # Cap suggestions at 6, ensure at least 3
        if len(suggestions) < 3:
            suggestions.extend([x for x in ["Garlic", "Olive Oil", "Lemon Juice", "Sea Salt"] if x not in suggestions])
        
        return suggestions[:6]

    def _clean_generated_recipe(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(data, dict):
            return {"recipes": []}
            
        # If the LLM returned a single recipe instead of wrapping it in recipes array
        if "recipes" not in data:
            if "title" in data or "name" in data:
                # Wrap it
                data = {"recipes": [data]}
            else:
                return {"recipes": []}
                
        cleaned_recipes = []
        for recipe in data.get("recipes", []):
            if not isinstance(recipe, dict):
                continue
                
            # Map top-level keys
            if "name" in recipe and "title" not in recipe:
                recipe["title"] = recipe.pop("name")
            if "cookingTime" in recipe and "cook_time" not in recipe:
                recipe["cook_time"] = recipe.pop("cookingTime")
            if "prepTime" in recipe and "prep_time" not in recipe:
                recipe["prep_time"] = recipe.pop("prepTime")
                
            # Ensure numerical types are clean
            for field in ["prep_time", "cook_time", "servings", "calories"]:
                if field in recipe:
                    try:
                        if isinstance(recipe[field], str):
                            digits = ''.join(c for c in recipe[field] if c.isdigit() or c == '.')
                            recipe[field] = int(float(digits)) if digits else 0
                        else:
                            recipe[field] = int(recipe[field])
                    except Exception:
                        recipe[field] = 0
                else:
                    recipe[field] = 0
                        
            for field in ["protein", "carbs", "fat"]:
                if field in recipe:
                    try:
                        if isinstance(recipe[field], str):
                            digits = ''.join(c for c in recipe[field] if c.isdigit() or c == '.')
                            recipe[field] = float(digits) if digits else 0.0
                        else:
                            recipe[field] = float(recipe[field])
                    except Exception:
                        recipe[field] = 0.0
                else:
                    recipe[field] = 0.0

            # Clean ingredients
            if "ingredients" in recipe and isinstance(recipe["ingredients"], list):
                cleaned_ing = []
                for ing in recipe["ingredients"]:
                    if isinstance(ing, dict):
                        # Map quantity/qty to amount
                        if "quantity" in ing and "amount" not in ing:
                            ing["amount"] = ing.pop("quantity")
                        elif "qty" in ing and "amount" not in ing:
                            ing["amount"] = ing.pop("qty")
                            
                        # Clean amount float
                        if "amount" in ing:
                            try:
                                if isinstance(ing["amount"], str):
                                    if "/" in ing["amount"]:
                                        parts = ing["amount"].split("/")
                                        ing["amount"] = float(parts[0]) / float(parts[1])
                                    else:
                                        digits = ''.join(c for c in ing["amount"] if c.isdigit() or c == '.')
                                        ing["amount"] = float(digits) if digits else 1.0
                                else:
                                    ing["amount"] = float(ing["amount"])
                            except Exception:
                                ing["amount"] = 1.0
                        else:
                            ing["amount"] = 1.0
                            
                        if "name" not in ing:
                            ing["name"] = "ingredient"
                        if "unit" not in ing:
                            ing["unit"] = "unit"
                        cleaned_ing.append(ing)
                    elif isinstance(ing, str):
                        cleaned_ing.append({"name": ing, "amount": 1.0, "unit": "pcs"})
                recipe["ingredients"] = cleaned_ing
            else:
                recipe["ingredients"] = []

            # Clean instructions
            if "instructions" in recipe and isinstance(recipe["instructions"], list):
                cleaned_inst = []
                for inst in recipe["instructions"]:
                    if isinstance(inst, dict):
                        cleaned_inst.append(inst.get("action") or inst.get("instruction") or inst.get("text") or str(inst))
                    else:
                        cleaned_inst.append(str(inst))
                recipe["instructions"] = cleaned_inst
            else:
                recipe["instructions"] = []
                
            cleaned_recipes.append(recipe)
            
        data["recipes"] = cleaned_recipes
        return data

    def _clean_nutrition_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(data, dict):
            return data
            
        # Clean numerical fields
        for field in ["calories", "score"]:
            if field in data:
                try:
                    if isinstance(data[field], str):
                        digits = ''.join(c for c in data[field] if c.isdigit() or c == '.')
                        data[field] = int(float(digits)) if digits else 0
                    else:
                        data[field] = int(data[field])
                except Exception:
                    data[field] = 0
            else:
                data[field] = 0
                
        for field in ["protein", "carbs", "fat"]:
            if field in data:
                try:
                    if isinstance(data[field], str):
                        digits = ''.join(c for c in data[field] if c.isdigit() or c == '.')
                        data[field] = float(digits) if digits else 0.0
                    else:
                        data[field] = float(data[field])
                except Exception:
                    data[field] = 0.0
            else:
                data[field] = 0.0
                
        if "breakdown" not in data:
            data["breakdown"] = "Analysis completed successfully."
        if "healthy_swaps" not in data:
            data["healthy_swaps"] = []
        elif isinstance(data["healthy_swaps"], list):
            data["healthy_swaps"] = [str(x) for x in data["healthy_swaps"]]
            
        return data
