import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://recipeuser:recipepassword@localhost:5432/recipehub"
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretjwtkeyrecipehub2026version123")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    AI_API_KEY: str = os.getenv("AI_API_KEY", "mock_key")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://api.x.ai/v1")
    AI_MODEL: str = os.getenv("AI_MODEL", "grok-2")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
