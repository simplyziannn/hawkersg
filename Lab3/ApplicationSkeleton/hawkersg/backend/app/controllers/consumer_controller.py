import os
from datetime import datetime
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.utils.email_utils import generate_reset_token, get_token_expiration, send_password_reset_email
from app.schemas.consumer_schema import ConsumerCreate
from app.schemas.user_schema import PasswordResetRequest, PasswordResetData
from app.models.consumer_model import Consumer
from app.models.user_model import User as DBUser

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "profilePhotos")

# Configuration for file validation
MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

# Define the password hashing context
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# --- Hashing Functions ---
def get_password_hash(password: str) -> str:
    """Hashes a plaintext password using Argon2."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

# --- DB Interaction Functions ---
def get_user_by_email(db: Session, email: str) -> Optional[DBUser]:
    """Retrieves a user (Consumer or other type) by email."""
    # Query the base User class 
    return db.query(DBUser).filter(DBUser.email == email).first() 

def create_user(db: Session, user: ConsumerCreate) -> Consumer:
    """The core business logic for signing up a new Consumer."""

    hashed_password = get_password_hash(user.password)

    # Create the Consumer DB model instance
    db_user = Consumer( 
        email=user.email, 
        hashed_password=hashed_password,
        username=user.username,
        user_type=user.user_type,
        profile_pic=None,
        
    )
 
    db.add(db_user)
    db.commit()
    db.refresh(db_user) 
    return db_user

def add_recent_search(db: Session, consumer_id: int, new_term: str):
    consumer = db.query(Consumer).filter(Consumer.id == consumer_id).first()
    if not consumer:
        return None

    # 1. Deserialize: Split the current string into a list
    current_list = consumer.recentlySearch.split('|') if consumer.recentlySearch else []
    
    # Remove duplicates and put the newest term at the front
    current_list = [term for term in current_list if term != new_term]
    current_list.insert(0, new_term)

    # Limit the list size (e.g., last 5 searches)
    current_list = current_list[:5]

    # 2. Serialize: Join the list back into a string using '|'
    consumer.recentlySearch = '|'.join(current_list)
    
    db.commit()
    db.refresh(consumer)
    return consumer

def handle_password_reset_request(db: Session, request: PasswordResetRequest) -> bool:
    email = request.email
    user = db.query(DBUser).filter(DBUser.email == email).first()
    
    if user:
        # 1. Generate token and expiration
        token = generate_reset_token()
        token_expires = get_token_expiration()

        # 2. SAVE the token and expiry time to the database
        user.reset_token = token
        user.token_expires = token_expires
        
        db.commit() 
        db.refresh(user)

        # 3. Send the email
        send_password_reset_email(email, token, user.username) 
        
    # Always return True for security reasons
    return True

def handle_password_reset(db: Session, data: PasswordResetData) -> None:
    """
    Verifies the token, checks expiration, and updates the user's password.
    """
    user = db.query(DBUser).filter(DBUser.reset_token == data.token).first()

    # 1. Token Existence Check
    if not user:
        raise HTTPException(
            status_code=400, 
            detail="Invalid or missing token. Password reset failed."
        )

    # 2. Token Expiration Check
    if user.token_expires is None or user.token_expires < datetime.now():
        # Clear the token after failure for security
        user.reset_token = None
        user.token_expires = None
        db.commit()
        raise HTTPException(
            status_code=400, 
            detail="Password reset token has expired. Please request a new one."
        )

    # 3. Hash and Update Password
    try:
        hashed_password = pwd_context.hash(data.new_password)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to hash password: {e}")

    user.hashed_password = hashed_password
    
    # 4. Invalidate the token after successful use
    user.reset_token = None
    user.token_expires = None

    db.commit()

async def update_consumer_profile(
    db: Session,
    user_id: int, 
    username: Optional[str],
    password: Optional[str],
    profile_pic: Optional[UploadFile],
) -> dict:
    """Updates the consumer's username, password, and/or profile picture."""
    
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        # This shouldn't happen if JWT is valid, but is a safe guard
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    consumer_data = {} # Used to track changes and build the response

    # 1. Update Username
    if username is not None and username.strip():
        if len(username.strip()) < 1:
             raise HTTPException(status_code=400, detail="Username must be at least 1 characters.")
        user.username = username.strip()
        consumer_data['username'] = user.username 

    # 2. Update Password
    if password:
        if len(password) < 8:
             raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
        user.hashed_password = get_password_hash(password)
        consumer_data['password_updated'] = True 

    # 3. Handle Profile Picture Upload and Validation
    if profile_pic and profile_pic.filename:
        # FastAPI's UploadFile is an instance of Starlette's UploadFile
        
        # 3a. Check File Type (MIME Type)
        if profile_pic.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
            )
            
        # 3b. Check File Size (Reading the first 1MB is needed to confirm size before full upload)        
        # Read the entire file content into a byte buffer for size check
        file_content = await profile_pic.read()
        
        if len(file_content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the maximum limit of 1MB."
            )

        # 3c. Rewind the file pointer for saving
        await profile_pic.seek(0)
        
        # 3d. Proceed with saving the file 
        file_extension = profile_pic.filename.split('.')[-1]
        new_filename = f"user_{user_id}_{int(datetime.now().timestamp())}.{file_extension}"
        file_path = f"{STATIC_DIR}/{new_filename}"

        os.makedirs(STATIC_DIR, exist_ok=True)
        
        try:
            # Re-read the file content into the buffer (since it was consumed by the size check)
            # Alternatively, if you did not use .read() above, you'd use shutil.copyfileobj directly.
            # Since we used .read() above, we must use the content we already read.
            with open(file_path, "wb") as buffer:
                 buffer.write(file_content) # Write the pre-read content
                 
        except Exception as e:
            db.rollback() 
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save profile picture: {e}"
            )

        # Update the model
        user.profile_pic = new_filename
        consumer_data['profile_pic'] = new_filename
        
    # 4. Check for updates and commit
    if not consumer_data:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields provided for update."
        )

    db.commit()
    db.refresh(user)
    
    # Return the full updated user object (matches ConsumerOut schema structure)
    return {
        "message": "Profile updated successfully.",
        "user": user # FastAPI will serialize this model object via the route's Pydantic schema
    }
