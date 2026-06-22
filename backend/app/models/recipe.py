from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String)
    ingredients = Column(JSON, nullable=False)  # List of dicts: [{"name": "flour", "amount": 200, "unit": "g"}]
    instructions = Column(JSON, nullable=False)  # List of strings: ["Mix ingredients", "Bake for 30m"]
    prep_time = Column(Integer, default=0)       # in minutes
    cook_time = Column(Integer, default=0)       # in minutes
    servings = Column(Integer, default=1)
    calories = Column(Integer, default=0)
    protein = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    fat = Column(Float, default=0.0)
    tags = Column(JSON, default=[])              # List of strings: ["vegan", "keto"]
    images = Column(JSON, default=[])            # List of strings: ["http://...", "http://..."]
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User")
