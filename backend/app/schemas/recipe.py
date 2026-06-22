from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any

class IngredientSchema(BaseModel):
    name: str
    amount: float
    unit: str

class RecipeBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    ingredients: List[IngredientSchema]
    instructions: List[str]
    prep_time: int = Field(0, ge=0)
    cook_time: int = Field(0, ge=0)
    servings: int = Field(1, ge=1)
    calories: int = Field(0, ge=0)
    protein: float = Field(0.0, ge=0.0)
    carbs: float = Field(0.0, ge=0.0)
    fat: float = Field(0.0, ge=0.0)
    tags: List[str] = []
    images: List[str] = []

class RecipeCreate(RecipeBase):
    pass

class RecipeResponse(RecipeBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserActivityCreate(BaseModel):
    recipe_id: int
    activity_type: str = Field(..., pattern="^(view|like|cook)$")
    rating: Optional[int] = Field(None, ge=1, le=5)

class UserActivityResponse(BaseModel):
    id: int
    user_id: int
    recipe_id: int
    activity_type: str
    rating: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
