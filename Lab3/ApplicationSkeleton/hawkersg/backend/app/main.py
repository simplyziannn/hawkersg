import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine, SessionLocal
from app.routes.consumer_route import router as consumer_router
from app.routes.business_route import router as business_router
from app.routes.favourite_route import router as favourite_router  
from app.routes.review_route import router as review_router
from app.routes.hawker_route import router as hawker_router
from app.routes.stall_route import router as stall_router

# Import models here so Base knows about them when calling create_all
from app.models import (
    user_model, 
    consumer_model,
    favourite_model,
    review_model,
    hawker_centre_model,
    business_model,
    operating_hour_model,
    menu_item_model
)

# SEEDING IMPORT
from app.assets.database_seed.seed_db import seed_sfa_data_if_empty

# Define paths relative to the current file (main.py is in 'app')
MAIN_DIR = os.path.dirname(__file__)

# Path to the index.json file (from app/main.py -> ../SFA/index.json)
INDEX_JSON_PATH = os.path.join(MAIN_DIR, "..", "SFA", "index.json")

# Define the directories where profile pictures are stored
# Use relative path to main.py file's location. E.g. /backend/app/assets/profilePhotos
STATIC_DIR = os.path.join(os.path.dirname(__file__), "assets", "profilePhotos")
BUSINESS_STATIC_DIR = os.path.join(os.path.dirname(__file__), "assets", "businessPhotos")

# Function to create tables
def create_db_and_tables():
    # Base.metadata.create_all requires all models to be imported before calling
    Base.metadata.create_all(bind=engine)

# Initialize App and DB
app = FastAPI(title="HawkerSG")

@app.on_event("startup")
def startup_db_and_seed():
    print("Running database table creation...")
    create_db_and_tables()
    print("Database tables ensured.")
    
    # 1. Get a fresh database session
    db = SessionLocal()
    
    try:
        # 2. Call the seeding function
        seed_sfa_data_if_empty(db, INDEX_JSON_PATH)
    except Exception as e:
        # Catch and print error, which would typically be a database issue
        print(f"Error during application startup seeding: {e}")
        # NOTE: The exception is primarily for logging, the app should still start.
    finally:
        # 3. Always close the session
        db.close()

# STATIC FILES CONFIGURATION
# 1. Mount the STATIC_DIR to a public URL path (e.g., /static/profiles)
# 2. The browser will access files at: http://localhost:8001/static/profiles/profilePicture.png
app.mount(
    "/static/profiles", 
    StaticFiles(directory=STATIC_DIR, check_dir=False), 
    name="profiles"
)

# 2. Mount business photos
os.makedirs(BUSINESS_STATIC_DIR, exist_ok=True)  # Ensure d irectory exists
app.mount(
    "/static/business", 
    StaticFiles(directory=BUSINESS_STATIC_DIR, check_dir=False), 
    name="business"
)

# Setup CORS (Crucial for frontend development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(consumer_router)
app.include_router(business_router)
app.include_router(favourite_router)
app.include_router(review_router)
app.include_router(hawker_router)
app.include_router(stall_router)

# Optional: Root route
@app.get("/")
def read_root():
    return {"message": "Welcome to the HawkerSG."}

# uvicorn app.main:app --reload --port 8001