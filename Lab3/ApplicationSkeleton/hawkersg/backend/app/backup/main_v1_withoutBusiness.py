from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from app.database import Base, engine # Base and engine
from app.routes.consumer_route import router as consumer_router # Import the router
# Import models here so Base knows about them when calling create_all
from app.models import user_model, consumer_model 

# Function to create tables
def create_db_and_tables():
    # Base.metadata.create_all requires all models to be imported before calling
    Base.metadata.create_all(bind=engine)

# Initialize App and DB
app = FastAPI(title="HawkerSG")
create_db_and_tables()

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

# Optional: Root route
@app.get("/")
def read_root():
    return {"message": "Welcome to the HawkerSG."}

# uvicorn app.main:app --reload --port 8001