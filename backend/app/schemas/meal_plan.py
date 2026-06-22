from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from app.schemas.recipe import RecipeResponse

class MealPlanCreate(BaseModel):
    recipe_id: int
    meal_date: date
    meal_type: str = Field(..., pattern="^(breakfast|lunch|dinner|snack)$")

class MealPlanResponse(BaseModel):
    id: int
    user_id: int
    recipe_id: int
    meal_date: date
    meal_type: str
    created_at: datetime
    recipe: Optional[RecipeResponse] = None

    class Config:
        from_attributes = True
