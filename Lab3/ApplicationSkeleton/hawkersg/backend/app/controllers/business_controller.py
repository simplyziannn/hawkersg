import os
from datetime import datetime
from typing import Optional, List
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.schemas.business_schema import BusinessCreate, BusinessUpdate, OperatingHourIn, MenuItemIn, MenuItemPatch
from app.models.business_model import Business, StallStatus
from app.models.operating_hour_model import OperatingHour
from app.models.menu_item_model import MenuItem
from app.models.user_model import User as DBUser

# Static directory for business photos
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "businessPhotos")

# Configuration for file validation
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20MB per spec
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

# Define the password hashing context (same as consumer)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# --- Hashing Functions (reuse from consumer pattern) ---
def get_password_hash(password: str) -> str:
    """Hashes a plaintext password using Argon2."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

# --- DB Interaction Functions ---
def get_user_by_email(db: Session, email: str) -> Optional[DBUser]:
    """Retrieves a user (Business or other type) by email."""
    return db.query(DBUser).filter(DBUser.email == email).first()

def get_business_by_license(db: Session, license_number: str) -> Optional[Business]:
    """Retrieves a business by license number."""
    business = db.query(Business).filter(Business.license_number == license_number).first()
    if business and business.status_today_only:
        # Check and reset daily status if needed
        business.reset_daily_status()
        db.commit()
    return business

def create_business(db: Session, business: BusinessCreate) -> Business:
    """The core business logic for signing up a new Business Owner."""
    
    # Check if license_number already exists
    existing = get_business_by_license(db, business.license_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License number already registered"
        )
    
    hashed_password = get_password_hash(business.password)
    
    # Create the Business DB model instance
    db_business = Business(
        email=business.email,
        hashed_password=hashed_password,
        username=business.username,
        user_type="business",
        license_number=business.license_number,
        stall_name=business.stall_name,
        licensee_name=business.licensee_name,
        establishment_address=business.establishment_address,
        hawker_centre=business.hawker_centre,
        postal_code=business.postal_code,
        description=business.description,
        photo=business.photo,
        status=StallStatus.OPEN
    )
    
    db.add(db_business)
    db.commit()
    db.refresh(db_business)
    return db_business

async def update_business_profile(
    db: Session, 
    license_number_from_path: str,
    license_number_from_token: str,
    business_update: BusinessUpdate,
    profile_pic: Optional[UploadFile] = None
) -> Optional[Business]:
    """Updates business profile information with authorization check."""
    
    # Get business by license number from path
    db_business = get_business_by_license(db, license_number_from_path)
    if not db_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    # Authorization check
    if license_number_from_token != license_number_from_path:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this business profile"
        )
    
    # Update only provided fields
    if business_update.stall_name is not None:
        db_business.stall_name = business_update.stall_name
    
    if business_update.status is not None:
        db_business.status = StallStatus.OPEN if business_update.status == "open" else StallStatus.CLOSED
        
        # Handle temporary closure
        if business_update.status_today_only is not None:
            db_business.status_today_only = business_update.status_today_only
            if business_update.status_today_only:
                db_business.status_updated_at = datetime.now()
            else:
                db_business.status_updated_at = None
    
    if business_update.description is not None:
        db_business.description = business_update.description
    
    # Handle profile photo upload if provided
    if profile_pic and profile_pic.filename:
        # Validate and save the photo
        photo_filename = await save_business_photo(db_business.license_number, profile_pic)
        db_business.photo = photo_filename
    
    db.commit()
    db.refresh(db_business)
    return db_business

async def save_business_photo(license_number: str, photo: UploadFile) -> str:
    """Validate and save business photo, return filename."""
    
    # Check file type
    if photo.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file_content = await photo.read()
    if len(file_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum limit of 20MB."
        )
    
    # Generate filename
    file_extension = photo.filename.split('.')[-1]
    new_filename = f"business_{license_number}_{int(datetime.now().timestamp())}.{file_extension}"
    file_path = os.path.join(STATIC_DIR, new_filename)
    
    # Ensure directory exists
    os.makedirs(STATIC_DIR, exist_ok=True)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save photo: {e}"
        )
    
    return new_filename

def set_operating_hours(
    db: Session, 
    license_number_from_path: str,
    license_number_from_token: str,
    operating_hours: List[OperatingHourIn]
) -> List[OperatingHour]:
    """Sets or updates operating hours for a business with authorization check."""
    
    # Get business and check authorization
    db_business = get_business_by_license(db, license_number_from_path)
    if not db_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    if license_number_from_token != license_number_from_path:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this business"
        )
    
    # Delete existing operating hours
    #db.query(OperatingHour).filter(OperatingHour.license_number == db_business.license_number).delete()
    
    # Add new operating hours
    db_hours = []
    for hour in operating_hours:
        day_exists = db.query(OperatingHour).filter(
            OperatingHour.license_number == db_business.license_number, 
            OperatingHour.day == hour.day
        ).first()
        if day_exists:
            day_exists.start_time = hour.start_time
            day_exists.end_time = hour.end_time
            db_hours.append(day_exists)
        else:
            db_hour = OperatingHour(
                license_number=db_business.license_number,
                day=hour.day,
                start_time=hour.start_time,
                end_time=hour.end_time
            )
            db.add(db_hour)
            db_hours.append(db_hour)
    
    db.commit()

    return db_hours

def add_menu_item(
    db: Session, 
    license_number_from_path: str,
    license_number_from_token: str,
    menu_item: MenuItemIn
) -> MenuItem:
    """Adds a menu item to a business with authorization check."""
    
    # Get business and check authorization
    db_business = get_business_by_license(db, license_number_from_path)
    if not db_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    if license_number_from_token != license_number_from_path:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this business"
        )
    
    db_menu_item = MenuItem(
        license_number=db_business.license_number,
        name=menu_item.name,
        price=menu_item.price,
        photo=menu_item.photo
    )
    db.add(db_menu_item)
    db.commit()
    db.refresh(db_menu_item)
    return db_menu_item

def update_menu_item(
    db: Session,
    license_number_from_path: str,
    license_number_from_token: str,
    item_id: int,
    menu_item: MenuItemPatch
) -> Optional[MenuItem]:
    """Updates a specific menu item with authorization check."""
    
    # Get business and check authorization
    db_business = get_business_by_license(db, license_number_from_path)
    if not db_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    if license_number_from_token != license_number_from_path:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this business"
        )
    
    # Get and update menu item
    #changes = menu_item.model_dump(exclude_unset=True)
    db_item = db.query(MenuItem).filter(
        MenuItem.id == item_id,
        MenuItem.license_number == db_business.license_number
    ).first()
    
    if not db_item:
        return None
    if menu_item.name is not None:
        db_item.name = menu_item.name
    if menu_item.price is not None:
        db_item.price = menu_item.price
    if menu_item.photo is not None:
        db_item.photo = menu_item.photo
    
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_menu_item(
    db: Session, 
    license_number_from_path: str,
    license_number_from_token: str,
    item_id: int
) -> bool:
    """Deletes a specific menu item with authorization check."""
    
    # Get business and check authorization
    db_business = get_business_by_license(db, license_number_from_path)
    if not db_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    if license_number_from_token != license_number_from_path:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this business"
        )
    
    result = db.query(MenuItem).filter(
        MenuItem.id == item_id,
        MenuItem.license_number == db_business.license_number
    ).delete()
    db.commit()
    return result > 0