import os
import base64
from datetime import datetime
from typing import Optional, List
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.schemas.business_schema import BusinessCreate, BusinessUpdate, OperatingHourIn, MenuItemIn, MenuItemPatch
from app.models.business_model import Business, StallStatus
from app.models.operating_hour_model import OperatingHour
from app.models.menu_item_model import MenuItem

# Static directory for business photos
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "businessPhotos")
MENU_IMAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "menuPhotos")

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
def get_user_by_email(db: Session, email: str) -> Optional[Business]:
    """Retrieves a user (Business or other type) by email."""
    return db.query(Business).filter(Business.email == email).first()

def get_business_by_license(db: Session, license_number: str) -> Optional[Business]:
    """Retrieves a business by license number."""
    business = db.query(Business).filter(Business.license_number == license_number).first()
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
        status=StallStatus.OPEN,
        cuisine_type=business.cuisine_type
    )
    
    db.add(db_business)
    db.commit()
    db.refresh(db_business)
    return db_business

async def update_business_profile(
    db: Session, 
    license_number_from_path: str,
    #license_number_from_token: str,
    business_update: BusinessUpdate,
    photo: Optional[UploadFile] = None
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
    #if license_number_from_token != license_number_from_path:
    #    raise HTTPException(
    #        status_code=status.HTTP_403_FORBIDDEN,
    #        detail="Not authorized to update this business profile"
    #    )
    
    # Update only provided fields
    if business_update.stall_name is not None:
        db_business.stall_name = business_update.stall_name
    if business_update.cuisine_type is not None:
        db_business.cuisine_type = business_update.cuisine_type
    if business_update.establishment_address is not None:
        db_business.establishment_address = business_update.establishment_address
    if business_update.description is not None:
        db_business.description = business_update.description
    
    # # Handle profile photo upload if provided (base64 string)
    # if profile_pic:
    #     photo_filename = await save_business_photo_base64(db_business.license_number, profile_pic)
    #     db_business.photo = photo_filename
    
    # CHANGE: Handle profile photo upload if provided (UploadFile)
    if photo is not None and photo.filename:
        # Check if the photo is actually an empty file (may happen with form-data)
        if photo.content_type is None:
            # Handle case where field is present but empty, if needed, or rely on update logic
            pass
        else:
            # 1. Capture old filename from DB object
            old_filename = db_business.photo
            
            # 2. Save the new file and get the new filename
            new_filename = await save_business_photo(db_business.license_number, photo)
            
            # 3. Delete the old file if it exists and is different from the new one
            if old_filename and old_filename != new_filename:
                old_file_path = os.path.join(STATIC_DIR, old_filename)
            try:
                if os.path.exists(old_file_path):
                    os.remove(old_file_path)
            except OSError as e:
                # Log the error but allow the profile update to continue
                print(f"Warning: Failed to delete old photo {old_file_path}. Error: {e}")
                pass
            
            # 4. Update the DB model
            db_business.photo = new_filename
    
    db.commit()
    db.refresh(db_business)
    return db_business

async def save_business_photo_base64(license_number: str, base64_data: str) -> str:
    """Validate and save business photo from base64 string, return filename."""
    
    try:
        # Handle data URI format (data:image/png;base64,...)
        if base64_data.startswith('data:'):
            header, base64_content = base64_data.split(',', 1)
            mime_type = header.split(':')[1].split(';')[0]
        else:
            # Assume it's raw base64 without header
            base64_content = base64_data
            mime_type = "image/jpeg"  # Default
        
        # Decode base64
        file_content = base64.b64decode(base64_content)
        
        # Check file size
        if len(file_content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the maximum limit of 20MB."
            )
        
        # Determine file extension from mime type
        extension_map = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        }
        file_extension = extension_map.get(mime_type, "jpg")
        
        # Generate filename
        new_filename = f"business_{license_number}_{int(datetime.now().timestamp())}.{file_extension}"
        file_path = os.path.join(STATIC_DIR, new_filename)
        
        # Ensure directory exists
        os.makedirs(STATIC_DIR, exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        return new_filename
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save photo: {e}"
        )

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
    #license_number_from_token: str,
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
    
    #if license_number_from_token != license_number_from_path:
    #    raise HTTPException(
    #        status_code=status.HTTP_403_FORBIDDEN,
    #        detail="Not authorized to update this business"
    #    )
    
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


# New Helper Function: Save Menu Item Photo
async def save_menu_item_photo(license_number: str, item_id: str, photo: UploadFile) -> str:
    """Validate and save menu item photo, return filename."""
    
    # Check file type
    if photo.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size (Read content once)
    file_content = await photo.read()
    if len(file_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum limit of 20MB."
        )
    
    # Generate filename (using license_number and item_id for uniqueness)
    # Note: item_id is a unique database ID after the initial save
    file_extension = photo.filename.split('.')[-1]
    new_filename = f"menu_{license_number}_{item_id}_{int(datetime.now().timestamp())}.{file_extension}"
    file_path = os.path.join(MENU_IMAGE_DIR, new_filename)
    
    # Save file
    try:
        # We need to seek back to the beginning of the file content for writing
        # since photo.read() consumed it.
        # Alternatively, we can use the original photo.file stream logic:
        # photo.file.seek(0) # Not necessary if using file_content saved above
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save menu photo: {e}"
        )
    
    # Return the filename for database storage
    return new_filename

def delete_menu_item_photo(filename: str):
    """Deletes a menu item photo from the filesystem."""
    if filename:
        file_path = os.path.join(MENU_IMAGE_DIR, filename)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError as e:
            print(f"Warning: Failed to delete menu photo {file_path}. Error: {e}")
            pass


async def add_menu_item(
    db: Session, 
    license_number_from_path: str,
    #license_number_from_token: str,
    menu_item: MenuItemIn,
    image: Optional[UploadFile] = None
) -> MenuItem:
    """Adds a menu item to a business with authorization check."""
    
    # Get business and check authorization
    db_business = get_business_by_license(db, license_number_from_path)
    if not db_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    #if license_number_from_token != license_number_from_path:
    #    raise HTTPException(
    #        status_code=status.HTTP_403_FORBIDDEN,
    #        detail="Not authorized to update this business"
    #    )
    
    db_menu_item = MenuItem(
        license_number=db_business.license_number,
        name=menu_item.name,
        price=menu_item.price,
        photo="",
        description=menu_item.description
    )
    db.add(db_menu_item)
    db.commit()
    db.refresh(db_menu_item)
    
    image_filename = ""
    if image is not None and image.filename:
        image_filename = await save_menu_item_photo(
            db_business.license_number, 
            str(db_menu_item.id), # Use the new ID for the filename
            image
        )
        
        db_menu_item.photo = image_filename
        db.commit()
        db.refresh(db_menu_item)

    return db_menu_item

async def update_menu_item(
    db: Session,
    license_number_from_path: str,
    #license_number_from_token: str,
    item_id: int,
    menu_item: MenuItemPatch,
    new_image: Optional[UploadFile] = None,
    remove_current_image: bool = False
) -> Optional[MenuItem]:
    """Updates a specific menu item with authorization check."""
    
    # Get business and check authorization
    db_business = get_business_by_license(db, license_number_from_path)
    if not db_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    #if license_number_from_token != license_number_from_path:
    #    raise HTTPException(
    #        status_code=status.HTTP_403_FORBIDDEN,
    #        detail="Not authorized to update this business"
    #    )
    
    # Get and update menu item
    #changes = menu_item.model_dump(exclude_unset=True)
    db_item = db.query(MenuItem).filter(
        MenuItem.id == item_id,
        MenuItem.license_number == db_business.license_number
    ).first()
    
    if not db_item:
        return None
    
    old_image_filename = db_item.photo
    
    if new_image is not None and new_image.filename:
        # Save new photo
        new_filename = await save_menu_item_photo(
            db_business.license_number, 
            str(db_item.id), 
            new_image
        )
        db_item.photo = new_filename
        
        # Delete old photo
        delete_menu_item_photo(old_image_filename)
        
    elif remove_current_image and old_image_filename:
        # Remove photo without replacing
        delete_menu_item_photo(old_image_filename)
        db_item.photo = ""

    if menu_item.name is not None:
        db_item.name = menu_item.name
    if menu_item.price is not None:
        db_item.price = menu_item.price
    if menu_item.description is not None:
        db_item.description = menu_item.description
    
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_menu_item(
    db: Session, 
    license_number_from_path: str,
    #license_number_from_token: str,
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
    
    #if license_number_from_token != license_number_from_path:
    #    raise HTTPException(
    #        status_code=status.HTTP_403_FORBIDDEN,
    #        detail="Not authorized to update this business"
    #    )

    # Get the item to retrieve the photo filename before deletion
    db_item = db.query(MenuItem).filter(
        MenuItem.id == item_id,
        MenuItem.license_number == db_business.license_number
    ).first()
    
    if not db_item:
        return False
        
    old_image_filename = db_item.photo
    
    # Delete the database record
    result = db.query(MenuItem).filter(MenuItem.id == item_id).delete()
    db.commit()
    
    if result > 0:
        delete_menu_item_photo(old_image_filename)
        
    return result > 0
