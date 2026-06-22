import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.services.recommendation_service import recommendation_service
from app.services.analytics_service import analytics_service

# Create an in-memory SQLite database for testing
DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency to point to the test database
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    # Create tables before each test
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables after each test
    Base.metadata.drop_all(bind=engine)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to TasteGram API", "status": "healthy"}

def test_auth_and_user_flows():
    # 1. Register User
    reg_response = client.post(
        "/auth/register",
        json={"username": "testuser", "email": "test@tastegram.com", "password": "password123"}
    )
    assert reg_response.status_code == 201
    assert reg_response.json()["username"] == "testuser"
    assert reg_response.json()["role"] == "admin"  # First user is seeded as admin

    # 2. Login to get token
    login_response = client.post(
        "/auth/token",
        data={"username": "testuser", "password": "password123"}
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["username"] == "testuser"
    
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get profile
    profile_response = client.get("/auth/me", headers=headers)
    assert profile_response.status_code == 200
    assert profile_response.json()["username"] == "testuser"

    # 4. Change password
    change_response = client.post(
        "/auth/change-password",
        json={"old_password": "password123", "new_password": "newpassword123"},
        headers=headers
    )
    assert change_response.status_code == 200
    assert change_response.json()["message"] == "Password updated successfully"

    # 5. Verify old password fails login
    failed_login = client.post(
        "/auth/token",
        data={"username": "testuser", "password": "password123"}
    )
    assert failed_login.status_code == 401

    # 6. Verify new password succeeds login
    success_login = client.post(
        "/auth/token",
        data={"username": "testuser", "password": "newpassword123"}
    )
    assert success_login.status_code == 200

def test_recipe_crud_and_recommendation():
    # Register and login first to get auth headers
    client.post(
        "/auth/register",
        json={"username": "chef", "email": "chef@tastegram.com", "password": "password123"}
    )
    login_response = client.post(
        "/auth/token",
        data={"username": "chef", "password": "password123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a recipe
    recipe_payload = {
        "title": "Keto Avocado Salad",
        "description": "Healthy avocado salad.",
        "ingredients": [
            {"name": "Avocado", "amount": 1, "unit": "piece"},
            {"name": "Tomato", "amount": 100, "unit": "g"}
        ],
        "instructions": ["Chop ingredients", "Mix together"],
        "prep_time": 5,
        "cook_time": 0,
        "servings": 1,
        "calories": 250,
        "protein": 3.0,
        "carbs": 12.0,
        "fat": 22.0,
        "tags": ["keto", "salad", "healthy"]
    }
    create_response = client.post("/recipes/", json=recipe_payload, headers=headers)
    assert create_response.status_code == 201
    recipe_id = create_response.json()["id"]

    # 2. Retrieve the recipe
    get_response = client.get(f"/recipes/{recipe_id}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["title"] == "Keto Avocado Salad"

    # 3. Log a cook activity (to populate recommendation engine)
    activity_response = client.post(
        f"/recipes/{recipe_id}/activity",
        json={"recipe_id": recipe_id, "activity_type": "cook", "rating": 5},
        headers=headers
    )
    assert activity_response.status_code == 200

    # 4. Run Jaccard Content-Based Recommendation (Unit Test of Service class directly)
    db_session = TestingSessionLocal()
    try:
        # Create another candidate recipe sharing the tag "salad"
        chef_user = db_session.query(Base.metadata.tables["users"]).first()
        from app.models.recipe import Recipe
        new_recipe = Recipe(
            title="Caesar Salad",
            description="Crispy Caesar Salad",
            ingredients=[{"name": "Lettuce", "amount": 150, "unit": "g"}],
            instructions=["Mix"],
            prep_time=5,
            calories=180,
            tags=["salad", "italian"],
            created_by_id=chef_user.id
        )
        db_session.add(new_recipe)
        db_session.commit()

        recs = recommendation_service.get_content_based_recommendations(db_session, user_id=chef_user.id)
        assert len(recs) > 0
        assert recs[0]["recipe"].title == "Caesar Salad"
        assert recs[0]["score"] > 0.0
        assert "salad" in recs[0]["reason"]
    finally:
        db_session.close()

def test_pandas_analytics():
    # Register, login, create, and log activity to populate DB
    client.post(
        "/auth/register",
        json={"username": "datauser", "email": "data@tastegram.com", "password": "password123"}
    )
    login_response = client.post(
        "/auth/token",
        data={"username": "datauser", "password": "password123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create recipe
    recipe_payload = {
        "title": "Healthy Toast",
        "ingredients": [{"name": "Bread", "amount": 1, "unit": "slice"}],
        "instructions": ["Toast bread"],
        "calories": 100,
        "tags": ["breakfast"]
    }
    create_response = client.post("/recipes/", json=recipe_payload, headers=headers)
    recipe_id = create_response.json()["id"]

    # Log views and likes
    client.post(f"/recipes/{recipe_id}/activity", json={"recipe_id": recipe_id, "activity_type": "view"}, headers=headers)
    client.post(f"/recipes/{recipe_id}/activity", json={"recipe_id": recipe_id, "activity_type": "like"}, headers=headers)

    # 1. Fetch dashboard analytics endpoint
    analytics_response = client.get("/analytics/dashboard", headers=headers)
    assert analytics_response.status_code == 200
    data = analytics_response.json()
    
    # Assert KPIs are compiled properly
    assert data["kpis"]["total_recipes"] == 1
    assert data["kpis"]["total_users"] == 1
    assert data["kpis"]["total_actions"] >= 2  # View + Like + auto view on fetch
