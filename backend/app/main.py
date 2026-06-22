import os
import time
import logging
from typing import Dict
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
import redis

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.routers import auth, recipes, ai, recommendations, analytics, ws, meal_plan
from app.routers import stories
from app.models.recipe import Recipe
from app.models.user import User
from app.models.story import Story
from app.routers.auth import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recipehub")

# Create tables
# In real production, we'd use Alembic, but Base.metadata.create_all is standard for startup auto-creation
# We put this in a retry loop to wait for PostgreSQL to boot up in Docker
db_connected = False
for i in range(10):
    try:
        logger.info(f"Connecting to database at {settings.DATABASE_URL}... (Attempt {i+1}/10)")
        Base.metadata.create_all(bind=engine)
        db_connected = True
        logger.info("Database connection and table creation successful.")
        break
    except Exception as e:
        logger.error(f"Database connection failed: {e}. Retrying in 3 seconds...")
        time.sleep(3)

if not db_connected:
    logger.critical("Could not connect to database after 10 attempts. Exiting.")

app = FastAPI(title="TasteGram API", version="1.0.0")

# CORS Middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REDIS RATE LIMITING MIDDLEWARE ---
# Protects the server from excessive requests. Falls back to in-memory if Redis is offline.
try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info("Connected to Redis cache successfully. Rate Limiter ACTIVE.")
    USE_REDIS = True
except Exception as e:
    logger.warning(f"Could not connect to Redis: {e}. Falling back to in-memory rate limiting.")
    USE_REDIS = False
    in_memory_limits: Dict[str, list] = {}

@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    # Bypass for WebSocket and API docs to prevent disruption
    path = request.url.path
    if path.startswith("/ws") or path.startswith("/docs") or path.startswith("/openapi.json"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    limit_key = f"rate_limit:{client_ip}"
    limit = 200  # max requests (increased to prevent false positives)
    window = 60  # period in seconds

    if USE_REDIS:
        try:
            current = redis_client.get(limit_key)
            if current and int(current) >= limit:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Too many requests. Please try again in a minute."}
                )
            # Increment request counter
            pipe = redis_client.pipeline()
            pipe.incr(limit_key)
            pipe.expire(limit_key, window)
            pipe.execute()
        except redis.RedisError as re:
            logger.error(f"Redis rate limiting error: {re}")
    else:
        # In-memory rate limiting fallback
        now = time.time()
        timestamps = in_memory_limits.get(client_ip, [])
        # Clean expired timestamps
        timestamps = [t for t in timestamps if now - t < window]
        if len(timestamps) >= limit:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again in a minute."}
            )
        timestamps.append(now)
        in_memory_limits[client_ip] = timestamps

    response = await call_next(request)
    return response

# --- ROUTER MOUNTS ---
app.include_router(auth.router)
app.include_router(recipes.router)
app.include_router(stories.router)
app.include_router(ai.router)
app.include_router(recommendations.router)
app.include_router(analytics.router)
app.include_router(meal_plan.router)
app.include_router(ws.router)

# --- STATIC FILES (uploaded story media) ---
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=UPLOAD_DIR), name="media")

@app.get("/")
def read_root():
    return {"message": "Welcome to TasteGram API", "status": "healthy"}

# --- DATABASE SEEDING ---
def seed_database(db: Session):
    # Check if recipes already exist
    if db.query(Recipe).count() > 0:
        return

    logger.info("Seeding database with initial recipe catalog...")

    # Create a system admin user to act as creator of seeded recipes
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            email="admin@tastegram.com",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    seeded_recipes = [
        Recipe(
            title="Margherita Pizza",
            description="Classic Italian pizza topped with fresh mozzarella, tomatoes, and basil leaves.",
            ingredients=[
                {"name": "Pizza Dough", "amount": 250, "unit": "g"},
                {"name": "Tomato Sauce", "amount": 100, "unit": "ml"},
                {"name": "Fresh Mozzarella", "amount": 120, "unit": "g"},
                {"name": "Fresh Basil Leaves", "amount": 6, "unit": "pieces"},
                {"name": "Olive Oil", "amount": 1, "unit": "tbsp"}
            ],
            instructions=[
                "Preheat oven to 250°C (480°F) or highest setting with baking stone inside.",
                "Roll out the dough into a 12-inch circle on parchment paper.",
                "Spread tomato sauce evenly, leaving a border for the crust.",
                "Tear fresh mozzarella cheese and distribute it over the sauce.",
                "Slide the pizza onto the hot stone and bake for 8-10 minutes until crust is browned and cheese is bubbly.",
                "Drizzle olive oil, top with fresh basil leaves, slice and enjoy."
            ],
            prep_time=15,
            cook_time=10,
            servings=2,
            calories=580,
            protein=22.0,
            carbs=72.0,
            fat=18.0,
            tags=["italian", "vegetarian", "classic"],
            created_by_id=admin.id,
            images=[
                "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?q=80&w=600",
                "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600"
            ]
        ),
        Recipe(
            title="Creamy Garlic Mushroom Pasta",
            description="Rich and velvety pasta made with garlic-infused cream, sauteed mushrooms, and parmesan.",
            ingredients=[
                {"name": "Penne Pasta", "amount": 200, "unit": "g"},
                {"name": "Mushrooms (Sliced)", "amount": 150, "unit": "g"},
                {"name": "Garlic (Minced)", "amount": 3, "unit": "cloves"},
                {"name": "Heavy Cream", "amount": 150, "unit": "ml"},
                {"name": "Grated Parmesan", "amount": 40, "unit": "g"},
                {"name": "Butter", "amount": 15, "unit": "g"},
                {"name": "Parsley", "amount": 1, "unit": "tbsp"}
            ],
            instructions=[
                "Boil pasta in salted water according to package directions, saving 1/2 cup pasta water.",
                "Melt butter in a skillet over medium heat. Add garlic and mushrooms, sauté for 6 minutes.",
                "Pour in heavy cream and let it simmer for 3 minutes.",
                "Stir in grated parmesan cheese until fully melted and creamy.",
                "Toss pasta and fresh parsley in the sauce, adding pasta water if it's too thick. Serve warm."
            ],
            prep_time=10,
            cook_time=15,
            servings=2,
            calories=640,
            protein=18.5,
            carbs=68.0,
            fat=32.0,
            tags=["pasta", "vegetarian", "quick"],
            created_by_id=admin.id,
            images=[
                "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?q=80&w=600",
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600"
            ]
        ),
        Recipe(
            title="Crispy Avocado Tofu Bowl",
            description="Healthy, protein-dense bowl packed with pan-seared tofu, avocado slices, quinoa, and spicy tahini.",
            ingredients=[
                {"name": "Firm Tofu", "amount": 200, "unit": "g"},
                {"name": "Cooked Quinoa", "amount": 150, "unit": "g"},
                {"name": "Avocado", "amount": 0.5, "unit": "piece"},
                {"name": "Tahini Paste", "amount": 2, "unit": "tbsp"},
                {"name": "Soy Sauce", "amount": 1, "unit": "tbsp"},
                {"name": "Lemon Juice", "amount": 1, "unit": "tbsp"},
                {"name": "Spinach", "amount": 50, "unit": "g"}
            ],
            instructions=[
                "Press tofu with a paper towel to remove water, then cube it.",
                "Sauté tofu cubes in a skillet with 1 tbsp sesame oil and soy sauce until crispy on all sides.",
                "Whisk tahini, lemon juice, garlic powder, and warm water together until smooth.",
                "Assemble the bowl: place quinoa, fresh spinach, sliced avocado, and crispy tofu next to each other.",
                "Drizzle tahini dressing over the bowl and garnish with sesame seeds."
            ],
            prep_time=15,
            cook_time=10,
            servings=1,
            calories=490,
            protein=20.0,
            carbs=38.0,
            fat=26.0,
            tags=["vegan", "gluten-free", "healthy"],
            created_by_id=admin.id,
            images=[
                "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600",
                "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600"
            ]
        )
    ]
    
    db.add_all(seeded_recipes)
    db.commit()
    logger.info("Database successfully seeded.")

# Run seeding on startup
@app.on_event("startup")
def startup_seeding():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
