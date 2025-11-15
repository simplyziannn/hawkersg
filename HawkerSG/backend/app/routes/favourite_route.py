from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from app.database import get_db
from app.schemas.favourite_schema import FavouriteIn, FavouriteOut
from app.controllers import favourite_controller as ctrl
from app.dependencies import get_current_user_id

router = APIRouter(prefix="/consumers/{consumer_id}/favourites", tags=["Favourites"])

def _check_owner_match(path_id: int, token_id: int):
    if path_id != token_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You are only authorized to manage your own resources."
        )

@router.get("", response_model=List[FavouriteOut])
def list_favourites(consumer_id: int, db: Session = Depends(get_db)):
    return ctrl.list_favourites(db, consumer_id)

@router.post("", response_model=Dict)
def add_favourite(consumer_id: int, fav: FavouriteIn, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    _check_owner_match(consumer_id, user_id)
    return ctrl.add_favourite(db, consumer_id, fav)

@router.delete("", response_model=Dict)
def remove_favourite(consumer_id: int, fav: FavouriteIn, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    _check_owner_match(consumer_id, user_id)
    return ctrl.remove_favourite(db, consumer_id, fav)

@router.post("/toggle", response_model=Dict)
def toggle_favourite(consumer_id: int, fav: FavouriteIn, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    _check_owner_match(consumer_id, user_id)
    return ctrl.toggle_favourite(db, consumer_id, fav)

@router.post("/check", response_model=Dict)
def check_favourite(consumer_id: int, fav: FavouriteIn, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    _check_owner_match(consumer_id, user_id)
    return ctrl.is_favourite(db, consumer_id, fav)
