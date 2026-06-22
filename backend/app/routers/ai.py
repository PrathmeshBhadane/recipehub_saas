from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from app.database import get_db
from sqlalchemy.orm import Session

from app.routers.auth import get_current_user
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.recipe import Recipe
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["ai"])
ai_service = AIService()

class GenerationRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = None

class NutritionRequest(BaseModel):
    recipe_text: str

class SuggestionRequest(BaseModel):
    base_ingredients: List[str]

class MealPlanAIRequest(BaseModel):
    target_calories: int
    diet_preference: Optional[str] = "balanced"  # 'vegan', 'keto', 'low-carb', 'balanced'

@router.post("/generate")
async def generate_recipe(
    req: GenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Context Injection: Query user's past activities to discover preferences
    # We fetch tags of recipes the user has 'liked' or 'cooked'
    liked_recipes = (
        db.query(Recipe.tags)
        .join(UserActivity, UserActivity.recipe_id == Recipe.id)
        .filter(UserActivity.user_id == current_user.id)
        .filter(UserActivity.activity_type.in_(["like", "cook"]))
        .limit(10)
        .all()
    )
    
    # Flatten liked tags list
    user_pref_tags = set()
    for row in liked_recipes:
        if row[0] and isinstance(row[0], list):
            for tag in row[0]:
                user_pref_tags.add(tag)
                
    context = ""
    if user_pref_tags:
        context = f"The user has shown a preference for recipes with tags: {', '.join(user_pref_tags)}. Try to align the recipe with these preferences where appropriate."

    # Call AI service
    recipe_data = await ai_service.generate_recipe(
        prompt=req.prompt,
        system_prompt=req.system_prompt,
        context=context if context else None
    )
    
    return recipe_data

@router.post("/analyze-nutrition")
async def analyze_nutrition(
    req: NutritionRequest,
    current_user: User = Depends(get_current_user)
):
    analysis = await ai_service.analyze_nutrition(req.recipe_text)
    return analysis

@router.post("/suggest-ingredients")
async def suggest_ingredients(
    req: SuggestionRequest,
    current_user: User = Depends(get_current_user)
):
    suggestions = await ai_service.suggest_ingredients(req.base_ingredients)
    return {"suggestions": suggestions}

@router.post("/meal-plan")
async def generate_ai_meal_plan(
    req: MealPlanAIRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Builds a structured meal plan. It searches the database for matching recipes first (Retrieval-Augmented style!),
    and falls back to custom generated structures if the database lacks items.
    """
    diet_tag = req.diet_preference.lower()
    
    # Query database for recipes matching diet tag
    from sqlalchemy import String
    matching_recipes = (
        db.query(Recipe)
        .filter(func.cast(Recipe.tags, String).ilike(f'%"{diet_tag}"%'))
        .limit(10)
        .all()
    )
    
    # If not enough, get general recipes
    if len(matching_recipes) < 3:
        matching_recipes += db.query(Recipe).limit(5).all()

    # Organise into Breakfast, Lunch, Dinner
    plan = {
        "breakfast": None,
        "lunch": None,
        "dinner": None,
        "total_calories": 0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0
    }
    
    meal_types = ["breakfast", "lunch", "dinner"]
    used_ids = set()
    
    for i, m_type in enumerate(meal_types):
        # Pick from matching database recipes first
        selected = None
        for r in matching_recipes:
            if r.id not in used_ids:
                selected = r
                used_ids.add(r.id)
                break
        
        if selected:
            plan[m_type] = {
                "id": selected.id,
                "title": selected.title,
                "calories": selected.calories,
                "protein": selected.protein,
                "carbs": selected.carbs,
                "fat": selected.fat
            }
            plan["total_calories"] += selected.calories
            plan["protein"] += selected.protein
            plan["carbs"] += selected.carbs
            plan["fat"] += selected.fat
        else:
            # Generate mock recipe items if database is empty
            mock_items = {
                "breakfast": {"title": "AI Oatmeal with Berries", "calories": 300, "protein": 10.0, "carbs": 45.0, "fat": 5.0},
                "lunch": {"title": "AI Quinoa Chickpea Salad", "calories": 550, "protein": 18.0, "carbs": 65.0, "fat": 15.0},
                "dinner": {"title": "AI Lemon Herb Tofu/Chicken", "calories": 650, "protein": 35.0, "carbs": 30.0, "fat": 20.0}
            }
            item = mock_items[m_type]
            plan[m_type] = item
            plan["total_calories"] += item["calories"]
            plan["protein"] += item["protein"]
            plan["carbs"] += item["carbs"]
            plan["fat"] += item["fat"]

    return plan
