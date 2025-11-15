from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.hawker_centre_model import HawkerCentre

router = APIRouter(
    prefix="/hawkers",
    tags=["Hawkers"]
)

@router.get("/")
def get_all_hawkers(db: Session = Depends(get_db)):
    """Return all hawker centres from the database."""
    hawkers = db.query(HawkerCentre).all()
    if not hawkers:
        raise HTTPException(status_code=404, detail="No hawker centres found in the database")
    return hawkers


@router.get("/{hawker_id}")
def get_hawker_by_id(hawker_id: int, db: Session = Depends(get_db)):
    """Return a single hawker centre by its ID."""
    hawker = db.query(HawkerCentre).filter(HawkerCentre.id == hawker_id).first()
    if not hawker:
        raise HTTPException(status_code=404, detail="Hawker centre not found")
    return hawker
