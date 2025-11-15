from typing import Dict, List, Optional, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.schemas.review_schema import ReviewIn, ReviewOut
from app.models.consumer_model import Consumer
from app.models.review_model import Review

from app.services.review_guard import guard_review_text


def _ensure_consumer(db: Session, consumer_id: int):
    """Ensures consumer exists. This remains for path validation."""
    if not db.query(Consumer).filter(Consumer.id == consumer_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consumer not found")

def _get_review_by_id_and_owner(db: Session, review_id: int, consumer_id: int) -> Review:
    """Retrieves a specific review, ensuring the consumer is the owner."""
    review = db.query(Review).filter(
        Review.id == review_id, 
        Review.consumer_id == consumer_id
    ).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found or not owned by consumer")
    return review

def _serialize_images_out(images_str: Optional[str]) -> List[str]:
    """Converts the stored string back to a list of strings."""
    return [p for p in (images_str or "").split("|") if p]

def _serialize_images_in(images_list: Optional[List[str]]) -> str:
    """Converts the list of strings to a pipe-delimited string for storage."""
    return "|".join(images_list or [])

def create_review(db: Session, consumer_id: int, payload: ReviewIn) -> ReviewOut:
    # SECURITY NOTE: Ideally, the consumer_id should come from the JWT, 
    # not the path, to prevent IDOR.
    _ensure_consumer(db, consumer_id)
    
    # Step 1: Run LLM moderation + constructiveness check
    verdict = guard_review_text(payload.description)
    if not verdict["ok"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=verdict["reason"],
        )

    # CHECK FOR DUPLICATE REVIEW (Optional business logic)
    existing_review = db.query(Review).filter(
        Review.consumer_id == consumer_id,
        Review.target_type == payload.target_type,
        Review.target_id == payload.target_id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Consumer has already reviewed this target."
        )

    new_review = Review(
        consumer_id=consumer_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        star_rating=payload.star_rating,
        description=payload.description or "",
        images=_serialize_images_in(payload.images),
    )
    
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    new_review.images = _serialize_images_out(new_review.images)
    
    # Use ORM mode for serialization
    return ReviewOut.model_validate(new_review)

"""
def update_review(db: Session, consumer_id: int, review_id: int, payload: ReviewUpdate) -> ReviewOut:
    review = _get_review_by_id_and_owner(db, review_id, consumer_id)
    
    update_data = payload.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if key == "images":
            setattr(review, key, _serialize_images_in(value))
        elif value is not None:
            setattr(review, key, value)
    
    db.commit()
    db.refresh(review)
    return ReviewOut.model_validate(review)
"""

def delete_review(db: Session, consumer_id: int, review_id: int) -> Dict:
    # This call includes the ownership check
    review = _get_review_by_id_and_owner(db, review_id, consumer_id) 
    
    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}

def list_reviews_for_target(db: Session, target_type: str, target_id: int) -> List[ReviewOut]:
    reviews = db.query(Review).filter(
        Review.target_type == target_type,
        Review.target_id == target_id
    ).order_by(Review.created_at.desc()).all() # Newest first
    
    return [ReviewOut.model_validate(r) for r in reviews]

def list_reviews_for_consumer(db: Session, consumer_id: int) -> List[ReviewOut]:
    _ensure_consumer(db, consumer_id)
    
    reviews = db.query(Review).filter(
        Review.consumer_id == consumer_id
    ).order_by(Review.created_at.desc()).all() # Newest first
    
    return [ReviewOut.model_validate(r) for r in reviews]

def get_avg_rating(db: Session, target_type: str, target_id: int) -> Dict[str, Any]:
    # Use SQLAlchemy's func.avg() to calculate the average rating in the database
    result = db.query(
        func.avg(Review.star_rating).label('average_rating'),
        func.count(Review.id).label('count')
    ).filter(
        Review.target_type == target_type,
        Review.target_id == target_id
    ).first()
    
    avg_rating = result.average_rating
    count = result.count
    
    return {
        "target_type": target_type, 
        "target_id": target_id, 
        "average_rating": round(avg_rating, 2) if avg_rating is not None else 0.0, 
        "count": count
    }