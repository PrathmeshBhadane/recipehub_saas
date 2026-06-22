from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.meal_plan import MealPlanCreate, MealPlanResponse

router = APIRouter(prefix="/meal-plans", tags=["meal-plans"])

@router.post("/", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
def create_meal_plan_entry(
    entry_in: MealPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify recipe exists
    recipe = db.query(Recipe).filter(Recipe.id == entry_in.recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Check if entry already exists on that date/meal_type (optional, allow duplicate/multiple)
    new_entry = MealPlan(
        user_id=current_user.id,
        recipe_id=entry_in.recipe_id,
        meal_date=entry_in.meal_date,
        meal_type=entry_in.meal_type
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    
    # Eagerly load recipe relationship for schema response
    new_entry.recipe = recipe
    return new_entry

@router.get("/", response_model=List[MealPlanResponse])
def get_meal_plan_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(MealPlan).filter(MealPlan.user_id == current_user.id)
    
    if start_date:
        query = query.filter(MealPlan.meal_date >= start_date)
    if end_date:
        query = query.filter(MealPlan.meal_date <= end_date)
        
    entries = query.order_by(MealPlan.meal_date.asc(), MealPlan.meal_type.asc()).all()
    
    # Ensure recipe is loaded for response
    for entry in entries:
        entry.recipe = db.query(Recipe).filter(Recipe.id == entry.recipe_id).first()
        
    return entries

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_plan_entry(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entry = db.query(MealPlan).filter(MealPlan.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")
        
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")
        
    db.delete(entry)
    db.commit()
    return None
