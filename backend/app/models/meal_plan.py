from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    meal_date = Column(Date, nullable=False)        # Date of the meal
    meal_type = Column(String, nullable=False)      # 'breakfast', 'lunch', 'dinner', 'snack'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    recipe = relationship("Recipe")
