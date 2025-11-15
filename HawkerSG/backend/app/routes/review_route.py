from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.review_schema import ReviewIn
from app.controllers import review_controller as ctrl
from app.dependencies import get_current_user_id
from app.controllers.review_controller import save_review_image_file

router = APIRouter(prefix="", tags=["Reviews"])

def _check_owner_match(path_id: int, token_id: int):
    if path_id != token_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You are only authorized to manage your own resources."
        )

@router.post("/reviews/upload-image", status_code=status.HTTP_201_CREATED)
async def upload_review_image(
    file: UploadFile = File(...), 
    user_id: int = Depends(get_current_user_id) # Requires authentication
) -> Dict[str, str]:
    """Handles the upload of a single review photo and returns its public path."""
    
    # Delegate the file saving and path generation to the controller/service layer
    try:
        public_path = save_review_image_file(file, user_id)
        return {"public_path": public_path}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"File upload error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save file on server.")

@router.post("/consumers/{consumer_id}/reviews", status_code=status.HTTP_201_CREATED)
def create_review(
    consumer_id: int, 
    payload: ReviewIn, 
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    _check_owner_match(consumer_id, user_id)
    return ctrl.upsert_review(db, consumer_id, payload)

# Delete a review (only owner)
@router.delete("/consumers/{consumer_id}/reviews/{review_id}", status_code=status.HTTP_200_OK)
def delete_review(
    consumer_id: int, 
    review_id: int, 
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    _check_owner_match(consumer_id, user_id)
    return ctrl.delete_review(db, consumer_id, review_id)

# List reviews for a target (business/hawker) - PUBLIC ROUTE
@router.get("/targets/{target_type}/{target_id}/reviews", response_model=List[Any])
def list_reviews_for_target(target_type: str, target_id: int, db: Session = Depends(get_db)):
    return ctrl.list_reviews_for_target(db, target_type, target_id)

# List reviews created by a consumer - PUBLIC ROUTE (Consumer's profile view)
@router.get("/consumers/{consumer_id}/reviews", response_model=List[Any])
def list_reviews_for_consumer(consumer_id: int, db: Session = Depends(get_db)):
    return ctrl.list_reviews_for_consumer(db, consumer_id)

# Average rating for a target - PUBLIC ROUTE
@router.get("/targets/{target_type}/{target_id}/reviews/average", response_model=Dict)
def get_avg_rating(target_type: str, target_id: int, db: Session = Depends(get_db)):
    return ctrl.get_avg_rating(db, target_type, target_id)
