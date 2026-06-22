import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from app.models.user_activity import UserActivity
from app.models.recipe import Recipe
from app.models.user import User

class AnalyticsService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(AnalyticsService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def get_dashboard_data(self, db: Session) -> dict:
        # 1. Fetch raw data from DB
        activities = db.query(UserActivity).all()
        recipes = db.query(Recipe).all()
        users = db.query(User).all()

        if not activities or not recipes:
            # Return empty/default structure if DB is fresh
            return self._get_default_analytics()

        # 2. Convert to Pandas DataFrames
        df_act = pd.DataFrame([{
            "id": a.id,
            "user_id": a.user_id,
            "recipe_id": a.recipe_id,
            "activity_type": a.activity_type,
            "rating": a.rating,
            "created_at": a.created_at
        } for a in activities])

        df_rec = pd.DataFrame([{
            "recipe_id": r.id,
            "title": r.title,
            "calories": r.calories,
            "protein": r.protein,
            "carbs": r.carbs,
            "fat": r.fat,
            "tags": r.tags
        } for r in recipes])

        df_usr = pd.DataFrame([{
            "user_id": u.id,
            "username": u.username,
            "created_at": u.created_at
        } for u in users])

        # --- DATA CLEANING ---
        # Impute missing ratings with the average rating (if any exist), or 0
        if "rating" in df_act.columns:
            mean_rating = df_act["rating"].mean()
            if pd.isna(mean_rating):
                mean_rating = 4.0
            df_act["rating"] = df_act["rating"].fillna(mean_rating)

        # Ensure datetime types
        df_act["created_at"] = pd.to_datetime(df_act["created_at"])
        df_usr["created_at"] = pd.to_datetime(df_usr["created_at"])

        # --- ANALYTICS ---
        
        # A. Activity Count by Type (Pie Chart Data)
        activity_counts = df_act["activity_type"].value_counts().to_dict()
        activity_breakdown = [
            {"name": k.capitalize(), "value": int(v)} for k, v in activity_counts.items()
        ]

        # B. Popular Recipes (Bar Chart Data)
        # Weight activities: cook = 3, like = 2, view = 1
        df_act["weight"] = df_act["activity_type"].map({"cook": 3, "like": 2, "view": 1}).fillna(1)
        recipe_popularity = df_act.groupby("recipe_id")["weight"].sum().reset_index()
        recipe_popularity = recipe_popularity.merge(df_rec, on="recipe_id")
        popular_recipes = (
            recipe_popularity.sort_values(by="weight", ascending=False)
            .head(5)[["title", "weight"]]
            .rename(columns={"title": "name", "weight": "score"})
            .to_dict(orient="records")
        )

        # C. User Retention & Active Users Analysis
        # Weekly Active Users (WAU) vs Monthly Active Users (MAU)
        max_date = df_act["created_at"].max()
        one_week_ago = max_date - pd.Timedelta(days=7)
        one_month_ago = max_date - pd.Timedelta(days=30)
        
        wau = df_act[df_act["created_at"] >= one_week_ago]["user_id"].nunique()
        mau = df_act[df_act["created_at"] >= one_month_ago]["user_id"].nunique()
        retention_rate = round((wau / max(mau, 1)) * 100, 2)

        # D. Macro Distribution by Tag
        # Unnest tags array
        tag_list = []
        for idx, row in df_rec.iterrows():
            if isinstance(row["tags"], list):
                for t in row["tags"]:
                    tag_list.append({
                        "tag": t,
                        "calories": row["calories"],
                        "protein": row["protein"],
                        "carbs": row["carbs"],
                        "fat": row["fat"]
                    })
        
        if tag_list:
            df_tags = pd.DataFrame(tag_list)
            tag_stats = df_tags.groupby("tag")[["calories", "protein", "carbs", "fat"]].mean().reset_index()
            macro_by_tag = tag_stats.head(6).to_dict(orient="records")
        else:
            macro_by_tag = []

        # E. Daily Cooking Activity (Area Chart Data)
        df_act["date_str"] = df_act["created_at"].dt.strftime("%Y-%m-%d")
        daily_activity = df_act.groupby("date_str")["id"].count().reset_index()
        daily_activity = daily_activity.sort_values(by="date_str").tail(10)
        daily_engagement = [
            {"date": row["date_str"], "actions": int(row["id"])}
            for idx, row in daily_activity.iterrows()
        ]

        # F. KPIs
        total_users = len(df_usr)
        total_recipes = len(df_rec)
        total_actions = len(df_act)

        return {
            "kpis": {
                "total_users": total_users,
                "total_recipes": total_recipes,
                "total_actions": total_actions,
                "retention_rate": retention_rate,
                "wau": wau,
                "mau": mau
            },
            "activity_breakdown": activity_breakdown,
            "popular_recipes": popular_recipes,
            "macro_by_tag": macro_by_tag,
            "daily_engagement": daily_engagement
        }

    def _get_default_analytics(self) -> dict:
        return {
            "kpis": {
                "total_users": 1,
                "total_recipes": 0,
                "total_actions": 0,
                "retention_rate": 100.0,
                "wau": 1,
                "mau": 1
            },
            "activity_breakdown": [
                {"name": "Views", "value": 0},
                {"name": "Likes", "value": 0},
                {"name": "Cooks", "value": 0}
            ],
            "popular_recipes": [],
            "macro_by_tag": [],
            "daily_engagement": []
        }

analytics_service = AnalyticsService()
