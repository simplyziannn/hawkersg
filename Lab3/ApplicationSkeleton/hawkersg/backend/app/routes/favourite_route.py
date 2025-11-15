from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
from app.database import get_db
from app.schemas.favourite_schema import FavouriteIn, FavouriteOut
from app.controllers import favourite_controller as ctrl

router = APIRouter(prefix="/consumers/{consumer_id}/favourites", tags=["Favourites"])

@router.get("", response_model=List[FavouriteOut])
def list_favourites(consumer_id: int, db: Session = Depends(get_db)):
    return ctrl.list_favourites(db, consumer_id)

@router.post("", response_model=Dict)
def add_favourite(consumer_id: int, fav: FavouriteIn, db: Session = Depends(get_db)):
    return ctrl.add_favourite(db, consumer_id, fav)

@router.delete("", response_model=Dict)
def remove_favourite(consumer_id: int, fav: FavouriteIn, db: Session = Depends(get_db)):
    return ctrl.remove_favourite(db, consumer_id, fav)

@router.post("/toggle", response_model=Dict)
def toggle_favourite(consumer_id: int, fav: FavouriteIn, db: Session = Depends(get_db)):
    return ctrl.toggle_favourite(db, consumer_id, fav)

@router.post("/check", response_model=Dict)
def check_favourite(consumer_id: int, fav: FavouriteIn, db: Session = Depends(get_db)):
    return ctrl.is_favourite(db, consumer_id, fav)
