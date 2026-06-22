from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, and_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.recipe import Recipe
from app.models.user_activity import UserActivity
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.recipe import RecipeCreate, RecipeResponse, UserActivityCreate, UserActivityResponse

router = APIRouter(prefix="/recipes", tags=["recipes"])

@router.post("/", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(
    recipe_in: RecipeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Convert Pydantic ingredients schema to dict
    ingredients_list = [ing.dict() for ing in recipe_in.ingredients]
    
    new_recipe = Recipe(
        title=recipe_in.title,
        description=recipe_in.description,
        ingredients=ingredients_list,
        instructions=recipe_in.instructions,
        prep_time=recipe_in.prep_time,
        cook_time=recipe_in.cook_time,
        servings=recipe_in.servings,
        calories=recipe_in.calories,
        protein=recipe_in.protein,
        carbs=recipe_in.carbs,
        fat=recipe_in.fat,
        tags=recipe_in.tags,
        images=recipe_in.images,
        created_by_id=current_user.id
    )
    db.add(new_recipe)
    db.commit()
    db.refresh(new_recipe)
    return new_recipe

@router.get("/", response_model=List[RecipeResponse])
def read_recipes(
    search: Optional[str] = None,
    tag: Optional[str] = None,
    max_prep_time: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Recipe)
    
    if search:
        query = query.filter(Recipe.title.ilike(f"%{search}%") | Recipe.description.ilike(f"%{search}%"))
        
    if max_prep_time is not None:
        query = query.filter(Recipe.prep_time <= max_prep_time)
        
    if tag:
        # In PostgreSQL/SQLite, tags is stored as a JSON array
        # For simplicity in both SQLite and Postgres: check if tag is in tags text serialization
        # Or write a general check. Let's do a text-based search for compatibility
        # e.g., Recipe.tags.cast(String).ilike(f'%"{tag}"%')
        from sqlalchemy import String
        query = query.filter(func.cast(Recipe.tags, String).ilike(f'%"{tag}"%'))

    return query.offset(offset).limit(limit).all()

# SQL Aggregations and Group By: Average prep time and calories grouped by tag.
# Demonstrates: GROUP BY, COUNT, AVG, CAST, JSON operations
@router.get("/stats")
def get_recipe_stats(db: Session = Depends(get_db)):
    # Since tags are JSON arrays, we can unnest them in Postgres or process in Python
    # For a robust cross-database demonstration, we fetch recipes and group in python,
    # OR we can write a SQL query to demonstrate Group By.
    # Let's perform a SQL query that groups by the creator to show joins and group by:
    # "Select user.username, COUNT(recipes.id) as count, AVG(recipes.calories) as avg_cal FROM recipes JOIN users ON recipes.created_by_id = users.id GROUP BY users.username"
    stats_query = (
        db.query(
            User.username,
            func.count(Recipe.id).label("recipe_count"),
            func.avg(Recipe.calories).label("avg_calories"),
            func.avg(Recipe.prep_time).label("avg_prep_time")
        )
        .join(Recipe, Recipe.created_by_id == User.id)
        .group_by(User.username)
        .all()
    )
    
    return [
        {
            "creator": row.username,
            "recipe_count": row.recipe_count,
            "avg_calories": float(row.avg_calories or 0),
            "avg_prep_time": float(row.avg_prep_time or 0)
        }
        for row in stats_query
    ]

# SQL Subquery: Select recipes that have protein higher than the global average protein of all recipes.
# Demonstrates: Subqueries, AVG
@router.get("/high-protein", response_model=List[RecipeResponse])
def get_high_protein_recipes(db: Session = Depends(get_db)):
    # subquery = db.query(func.avg(Recipe.protein)).scalar_subquery()
    # query = db.query(Recipe).filter(Recipe.protein > subquery)
    avg_protein_subquery = select(func.avg(Recipe.protein)).scalar_subquery()
    query = select(Recipe).where(Recipe.protein > avg_protein_subquery)
    results = db.scalars(query).all()
    return results

@router.get("/{id}", response_model=RecipeResponse)
def read_recipe(
    id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipe = db.query(Recipe).filter(Recipe.id == id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    # Record view activity if user is authenticated
    if current_user:
        view_activity = UserActivity(
            user_id=current_user.id,
            recipe_id=recipe.id,
            activity_type="view"
        )
        db.add(view_activity)
        db.commit()
        
    return recipe

@router.put("/{id}", response_model=RecipeResponse)
def update_recipe(
    id: int,
    recipe_in: RecipeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipe = db.query(Recipe).filter(Recipe.id == id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    if recipe.created_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this recipe")
        
    recipe.title = recipe_in.title
    recipe.description = recipe_in.description
    recipe.ingredients = [ing.dict() for ing in recipe_in.ingredients]
    recipe.instructions = recipe_in.instructions
    recipe.prep_time = recipe_in.prep_time
    recipe.cook_time = recipe_in.cook_time
    recipe.servings = recipe_in.servings
    recipe.calories = recipe_in.calories
    recipe.protein = recipe_in.protein
    recipe.carbs = recipe_in.carbs
    recipe.fat = recipe_in.fat
    recipe.tags = recipe_in.tags
    recipe.images = recipe_in.images
    
    db.commit()
    db.refresh(recipe)
    return recipe

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipe = db.query(Recipe).filter(Recipe.id == id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    if recipe.created_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this recipe")
        
    # Delete dependent activities and meal plans
    db.query(UserActivity).filter(UserActivity.recipe_id == id).delete()
    db.commit()
    
    db.delete(recipe)
    db.commit()
    return None

@router.post("/{id}/activity", response_model=UserActivityResponse)
def record_activity(
    id: int,
    activity_in: UserActivityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipe = db.query(Recipe).filter(Recipe.id == id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    # If it is a 'like', let's check if they already liked it. If so, update or toggle.
    if activity_in.activity_type == "like":
        existing = db.query(UserActivity).filter(
            UserActivity.user_id == current_user.id,
            UserActivity.recipe_id == id,
            UserActivity.activity_type == "like"
        ).first()
        if existing:
            # Toggling like (unlike)
            db.delete(existing)
            db.commit()
            # Return a mock or empty response since it's deleted
            # Or raise status code
            raise HTTPException(status_code=200, detail="Like removed")
            
    activity = UserActivity(
        user_id=current_user.id,
        recipe_id=id,
        activity_type=activity_in.activity_type,
        rating=activity_in.rating
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity
