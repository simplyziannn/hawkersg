from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.consumer_schema import ConsumerCreate, ConsumerOut, Consumer_Token, SearchHistoryRequest, UpdateProfileResponse
from app.schemas.user_schema import PasswordResetRequest, PasswordResetData
from app.controllers import consumer_controller
from app.utils.jwt_utils import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.dependencies import get_current_user_id

router = APIRouter(prefix="/consumer")

@router.post("/signup", response_model=ConsumerOut, status_code=status.HTTP_201_CREATED)
def signup_user(user_in: ConsumerCreate, db: Session = Depends(get_db)): # <-- Use ConsumerCreate
    """Handles the POST request for user sign up."""

    if consumer_controller.get_user_by_email(db, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    try:
        # Returns a Consumer object which is mapped to ConsumerOut
        new_user = consumer_controller.create_user(db, user=user_in) 
        return new_user
    except Exception as e:
        print(f"Error during sign up: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create user.")

@router.post("/login", response_model=Consumer_Token, status_code=status.HTTP_200_OK)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticates a user by email and password and returns a JWT."""
    email = form_data.username 
    password = form_data.password
    
    # 1. Retrieve user by email
    db_user = consumer_controller.get_user_by_email(db, email) 

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # 2. Verify password hash
    if not consumer_controller.verify_password(password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # 3. Update: Checks that user whom login from this URL is a Consumer
    if db_user.user_type != "consumer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # 4. JWT Creation
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Create the token payload with essential user info
    access_token = create_access_token(
        data={
            "user_id": db_user.id, 
            "email": db_user.email, 
            "type": db_user.user_type
        },
        expires_delta=access_token_expires
    )
    
    # 5. Success: Return the Token object
    # FastAPI automatically serializes db_user into Consumer thanks to `response_model=Consumer_Token` and `Consumer_Token.user: ConsumerOut`.
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/forgot-password", status_code=200)
def request_password_reset(
    request: PasswordResetRequest, 
    db: Session = Depends(get_db)
):
    """
    Initiates the password reset flow.
    Returns a success status regardless of whether the email is registered
    (for security).
    """
    # The controller handles the lookup, token generation, and email sending
    consumer_controller.handle_password_reset_request(db, request)
    
    # Return a generic success response to implement the security best practice
    return {"message": "If the email is registered, a password reset link has been sent."}

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_user_password(
    data: PasswordResetData, 
    db: Session = Depends(get_db)
):
    """
    Finalizes the password reset by validating the token and setting the new password.
    """
    try:
        consumer_controller.handle_password_reset(db, data)
        return {"message": "Password successfully reset."}
    except HTTPException as e:
        # Re-raise explicit exceptions from the controller
        raise e
    except Exception:
        # Catch unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during password reset."
        )

@router.put("/update-profile", response_model=UpdateProfileResponse, status_code=status.HTTP_200_OK)
async def update_profile(
    db: Session = Depends(get_db),
    # Inject user_id securely from the JWT token
    user_id: int = Depends(get_current_user_id), 
    
    # Form() is used for text fields
    username: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    
    # File() is used for the file upload
    profile_pic: Optional[UploadFile] = File(None),
):
    """Updates consumer profile details using JWT authentication."""
    try:
        updated_data = await consumer_controller.update_consumer_profile(
            db,
            user_id, 
            username,
            password,
            profile_pic
        )
        return updated_data
        
    except HTTPException as e:
        raise e
    except Exception as e:
        # Generic error handling
        print(f"Update profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error: Failed to update profile."
        )


@router.post("/add-search-history")
def add_search_to_history(
    request: SearchHistoryRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Adds a search term to the consumer's recent search history.
    """
    updated_consumer = consumer_controller.add_recent_search(
        db=db,
        consumer_id=user_id,
        new_term=request.search_term
    )
    
    if not updated_consumer:
        raise HTTPException(status_code=404, detail="Consumer not found")
        
    # Return a minimal success message or the updated search history string if desired
    return {"message": "Search history updated successfully", "search_history": updated_consumer.recentlySearch.split('|')}