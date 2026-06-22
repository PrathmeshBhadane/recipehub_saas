from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    activity_type = Column(String, nullable=False)  # 'view', 'like', 'cook'
    rating = Column(Integer, nullable=True)         # 1-5 star rating if cooked/reviewed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    recipe = relationship("Recipe")
