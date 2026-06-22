from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.recommendation_service import recommendation_service
from app.schemas.recipe import RecipeResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

def format_recommendation_response(rec_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {
            "recipe": RecipeResponse.model_validate(r["recipe"]),
            "score": r["score"],
            "reason": r["reason"],
            "algorithm": r["algorithm"]
        }
        for r in rec_list
    ]

@router.get("/content-based")
def get_content_recs(
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recs = recommendation_service.get_content_based_recommendations(db, current_user.id, limit)
    return format_recommendation_response(recs)

@router.get("/collaborative")
def get_collab_recs(
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recs = recommendation_service.get_collaborative_recommendations(db, current_user.id, limit)
    return format_recommendation_response(recs)

@router.get("/hybrid")
def get_hybrid_recs(
    limit: int = 6,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Hybrid recommender combining both collaborative and content-based models.
    """
    collab = recommendation_service.get_collaborative_recommendations(db, current_user.id, limit)
    content = recommendation_service.get_content_based_recommendations(db, current_user.id, limit)
    
    # Merge, prioritizing collaborative, then content, avoiding duplicates
    seen_ids = set()
    combined = []
    
    for r in collab + content:
        r_id = r["recipe"].id
        if r_id not in seen_ids:
            seen_ids.add(r_id)
            combined.append(r)
            
    return format_recommendation_response(combined[:limit])
