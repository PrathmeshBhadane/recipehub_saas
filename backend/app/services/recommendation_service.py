from typing import List, Dict, Any, Set
from sqlalchemy.orm import Session
from app.models.recipe import Recipe
from app.models.user_activity import UserActivity

class RecommendationService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(RecommendationService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def get_content_based_recommendations(self, db: Session, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Content-Based Filtering using Jaccard Similarity on tags.
        Jaccard = |A intersect B| / |A union B|
        """
        # 1. Get recipes liked/cooked by user
        user_activities = (
            db.query(UserActivity)
            .filter(UserActivity.user_id == user_id)
            .filter(UserActivity.activity_type.in_(["like", "cook"]))
            .all()
        )
        
        interacted_recipe_ids = {a.recipe_id for a in user_activities}
        
        if not interacted_recipe_ids:
            # Cold start: Return popular recipes
            return self._get_fallback_popular(db, limit)

        # 2. Build user profile: set of all tags and ingredients the user liked
        user_tags: Set[str] = set()
        user_ingredients: Set[str] = set()
        
        liked_recipes = db.query(Recipe).filter(Recipe.id.in_(interacted_recipe_ids)).all()
        for recipe in liked_recipes:
            if recipe.tags:
                user_tags.update([t.lower() for t in recipe.tags])
            if recipe.ingredients:
                user_ingredients.update([ing["name"].lower() for ing in recipe.ingredients])

        user_features = user_tags.union(user_ingredients)
        if not user_features:
            return self._get_fallback_popular(db, limit)

        # 3. Score all other recipes in DB
        candidate_recipes = db.query(Recipe).filter(~Recipe.id.in_(interacted_recipe_ids)).all()
        recommendations = []

        for recipe in candidate_recipes:
            recipe_tags = {t.lower() for t in recipe.tags} if recipe.tags else set()
            recipe_ingredients = {ing["name"].lower() for ing in recipe.ingredients} if recipe.ingredients else set()
            recipe_features = recipe_tags.union(recipe_ingredients)
            
            if not recipe_features:
                continue

            intersection = user_features.intersection(recipe_features)
            union = user_features.union(recipe_features)
            jaccard_score = len(intersection) / len(union) if union else 0.0

            if jaccard_score > 0:
                recommendations.append({
                    "recipe": recipe,
                    "score": round(jaccard_score, 2),
                    "reason": f"Matches your interest in: {', '.join(list(intersection)[:3])}",
                    "algorithm": "Content-Based Filtering"
                })

        # Sort by score desc
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        return recommendations[:limit]

    def get_collaborative_recommendations(self, db: Session, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        User-Based Collaborative Filtering.
        Finds users similar to current user, and recommends recipes they liked that current user hasn't.
        """
        # 1. Fetch all 'like' or 'cook' activities in database
        all_activities = (
            db.query(UserActivity)
            .filter(UserActivity.activity_type.in_(["like", "cook"]))
            .all()
        )

        # Map users to their liked recipe sets
        user_to_recipes: Dict[int, Set[int]] = {}
        for act in all_activities:
            if act.user_id not in user_to_recipes:
                user_to_recipes[act.user_id] = set()
            user_to_recipes[act.user_id].add(act.recipe_id)

        target_user_recipes = user_to_recipes.get(user_id, set())
        if not target_user_recipes:
            # Cold start
            return self._get_fallback_popular(db, limit)

        # 2. Compute Jaccard similarities between target user and all other users
        user_similarities: Dict[int, float] = {}
        for other_user_id, other_recipes in user_to_recipes.items():
            if other_user_id == user_id:
                continue
            
            intersection = target_user_recipes.intersection(other_recipes)
            union = target_user_recipes.union(other_recipes)
            similarity = len(intersection) / len(union) if union else 0.0
            
            if similarity > 0:
                user_similarities[other_user_id] = similarity

        if not user_similarities:
            # No similar users, fallback to content-based
            return self.get_content_based_recommendations(db, user_id, limit)

        # 3. Find candidate recipes liked by similar users but not current user
        recipe_scores: Dict[int, float] = {}
        recipe_reasons: Dict[int, List[str]] = {}

        for other_user_id, similarity in user_similarities.items():
            other_recipes = user_to_recipes[other_user_id]
            unseen_recipes = other_recipes.difference(target_user_recipes)
            
            for recipe_id in unseen_recipes:
                recipe_scores[recipe_id] = recipe_scores.get(recipe_id, 0.0) + similarity
                # Record username of similar user for explanation
                from app.models.user import User
                similar_user = db.query(User).filter(User.id == other_user_id).first()
                u_name = similar_user.username if similar_user else f"User #{other_user_id}"
                if recipe_id not in recipe_reasons:
                    recipe_reasons[recipe_id] = []
                recipe_reasons[recipe_id].append(u_name)

        # 4. Query recipes and score them
        recommendations = []
        if not recipe_scores:
            return self._get_fallback_popular(db, limit)

        scored_recipe_ids = list(recipe_scores.keys())
        recipes = db.query(Recipe).filter(Recipe.id.in_(scored_recipe_ids)).all()
        
        for recipe in recipes:
            score = recipe_scores[recipe.id]
            similar_users_list = recipe_reasons[recipe.id]
            recommendations.append({
                "recipe": recipe,
                # Normalize score mapping to 0.0 - 1.0 range roughly or keep raw sum
                "score": round(min(score, 1.0), 2),
                "reason": f"Liked by similar users: {', '.join(similar_users_list[:2])}",
                "algorithm": "User-Based Collaborative Filtering"
            })

        recommendations.sort(key=lambda x: x["score"], reverse=True)
        return recommendations[:limit]

    def _get_fallback_popular(self, db: Session, limit: int) -> List[Dict[str, Any]]:
        # Count cooking or liking activity grouped by recipe
        from sqlalchemy import func
        popular_activities = (
            db.query(UserActivity.recipe_id, func.count(UserActivity.id).label("count"))
            .filter(UserActivity.activity_type.in_(["like", "cook"]))
            .group_by(UserActivity.recipe_id)
            .order_by(func.count(UserActivity.id).desc())
            .limit(limit)
            .all()
        )

        popular_ids = [a.recipe_id for a in popular_activities]
        
        if not popular_ids:
            # If no activities in DB at all, just return first recipes
            recipes = db.query(Recipe).limit(limit).all()
            return [
                {
                    "recipe": r,
                    "score": 0.5,
                    "reason": "Featured Recipe",
                    "algorithm": "Cold Start Fallback"
                }
                for r in recipes
            ]

        recipes = db.query(Recipe).filter(Recipe.id.in_(popular_ids)).all()
        # sort in order of popularity
        recipes_dict = {r.id: r for r in recipes}
        sorted_recipes = [recipes_dict[pid] for pid in popular_ids if pid in recipes_dict]
        
        return [
            {
                "recipe": r,
                "score": 0.8,
                "reason": "Popular among all users",
                "algorithm": "Cold Start Fallback"
            }
            for r in sorted_recipes
        ]

recommendation_service = RecommendationService()
