from sqlalchemy.orm import Session
from sqlalchemy import exists, and_
from fastapi import HTTPException, status
from typing import List, Dict
from app.models.consumer_model import Consumer
from app.models.favourite_model import Favourite
from app.schemas.favourite_schema import FavouriteIn, FavouriteOut, TargetType

def _ensure_consumer(db: Session, consumer_id: int):
    """Checks if the consumer exists, raising 404 if not."""
    if not db.query(Consumer).filter(Consumer.id == consumer_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consumer not found")

def _get_favourite_query_filters(consumer_id: int, target_type: TargetType, target_id: int):
    """Helper to build the common SQLAlchemy filter conditions."""
    return Favourite.consumer_id == consumer_id, \
           Favourite.target_type == target_type, \
           Favourite.target_id == target_id

def _is_favourite(db: Session, consumer_id: int, target_type: TargetType, target_id: int) -> bool:
    """Checks if a specific target is already favourited by the consumer."""
    q = _get_favourite_query_filters(consumer_id, target_type, target_id)
    return db.query(exists().where(and_(*q))).scalar()

def add_favourite(db: Session, consumer_id: int, payload: FavouriteIn) -> Dict:
    _ensure_consumer(db, consumer_id)
    
    if _is_favourite(db, consumer_id, payload.target_type, payload.target_id):
        return {
            "status": "ok",
            "action": "exists",
            "consumer_id": consumer_id,
            "target_type": payload.target_type,
            "target_id": payload.target_id,
        }
    
    new_fav = Favourite(
        consumer_id=consumer_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
    )
    db.add(new_fav)
    db.commit()
    db.refresh(new_fav)
    
    return {
        "status": "ok",
        "action": "added",
        "consumer_id": consumer_id,
        "target_type": payload.target_type,
        "target_id": payload.target_id,
    }

def remove_favourite(db: Session, consumer_id: int, payload: FavouriteIn) -> Dict:
    _ensure_consumer(db, consumer_id)
    
    q = _get_favourite_query_filters(consumer_id, payload.target_type, payload.target_id)
    removed_count = db.query(Favourite).filter(and_(*q)).delete(synchronize_session='fetch')
    
    if removed_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favourite not found")
    
    db.commit()
    return {"status": "ok", "action": "removed"}

def list_favourites(db: Session, consumer_id: int) -> List[FavouriteOut]:
    _ensure_consumer(db, consumer_id)
    
    favourites = db.query(Favourite).filter(Favourite.consumer_id == consumer_id).all()
    
    return [FavouriteOut.model_validate(fav) for fav in favourites]

def is_favourite(db: Session, consumer_id: int, payload: FavouriteIn) -> Dict:
    _ensure_consumer(db, consumer_id)
    
    is_fav = _is_favourite(db, consumer_id, payload.target_type, payload.target_id)
    
    return {"is_favourite": is_fav}

def toggle_favourite(db: Session, consumer_id: int, payload: FavouriteIn) -> Dict:
    _ensure_consumer(db, consumer_id)

    if _is_favourite(db, consumer_id, payload.target_type, payload.target_id):
        q = _get_favourite_query_filters(consumer_id, payload.target_type, payload.target_id)
        db.query(Favourite).filter(and_(*q)).delete(synchronize_session='fetch')
        db.commit()
        return {"status": "ok", "action": "removed"}
    else:
        new_fav = Favourite(
            consumer_id=consumer_id,
            target_type=payload.target_type,
            target_id=payload.target_id,
        )
        db.add(new_fav)
        db.commit()
        return {"status": "ok", "action": "added"}
