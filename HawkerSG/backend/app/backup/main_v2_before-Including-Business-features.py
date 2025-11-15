import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.staticfiles import StaticFiles
from app.database import Base, engine # Base and engine
from app.routes.consumer_route import router as consumer_router # Import the consumer router
from app.routes.business_route import router as business_router # Import the business router
from app.routes.favourite_route import router as favourite_router  
from app.routes.review_route import router as review_router

# Import models here so Base knows about them when calling create_all
from app.models import (
    user_model, 
    consumer_model,
    business_model,
    operating_hour_model,
    menu_item_model
)

# Define the directory where profile pictures are stored
# Use relative path to main.py file's location. E.g. /backend/app/assets/profilePhotos
STATIC_DIR = os.path.join(os.path.dirname(__file__), "assets", "profilePhotos")

# Function to create tables
def create_db_and_tables():
    # Base.metadata.create_all requires all models to be imported before calling
    Base.metadata.create_all(bind=engine)

# Initialize App and DB
app = FastAPI(title="HawkerSG")
create_db_and_tables()

# STATIC FILES CONFIGURATION
# 1. Mount the STATIC_DIR to a public URL path (e.g., /static/profiles)
# 2. The browser will access files at: http://localhost:8001/static/profiles/profilePicture.png
app.mount(
    "/static/profiles", 
    StaticFiles(directory=STATIC_DIR), 
    name="profiles"
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

# Optional: Root route
@app.get("/")
def read_root():
    return {"message": "Welcome to the HawkerSG."}

# uvicorn app.main:app --reload --port 8001