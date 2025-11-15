from datetime import timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.business_schema import (
    BusinessCreate, BusinessOut, BusinessUpdate, Business_Token,
    OperatingHoursUpdate, MenuItemIn, MenuItemOut, MenuItemPatch, OperatingHourOut
)
from app.schemas.user_schema import UserLogin
from app.controllers import business_controller
from app.utils.jwt_utils import create_access_token, ACCESS_TOKEN_EXPIRE_SECONDS
from app.dependencies import get_current_license_number

router = APIRouter(prefix="/business", tags=["Business"])

# ===== Authentication Endpoints (No JWT Required) =====

@router.post("/signup", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def signup_business(business_in: BusinessCreate, db: Session = Depends(get_db)):
    """Handles the POST request for business owner sign up."""
    
    # Check if email already exists
    if business_controller.get_user_by_email(db, business_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create new business account
        new_business = business_controller.create_business(db, business=business_in)
        return new_business
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error during business signup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create business account."
        )

@router.post("/login", response_model=Business_Token, status_code=status.HTTP_200_OK)
def login_business(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticates a business owner by email and password and returns JWT."""

    email = form_data.username
    password = form_data.password

    # 1. Retrieve user by email
    db_user = business_controller.get_user_by_email(db, email)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # 2. Verify password hash
    if not business_controller.verify_password(password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # 3. Check user type (must be business)
    if db_user.user_type != "business":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # 4. Get the business to access license_number
    business = db.query(business_controller.Business).filter(
        business_controller.Business.id == db_user.id
    ).first()
    
    if not business:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Business profile not found"
        )
    
    # 5. JWT Creation with license_number
    access_token_expires = timedelta(seconds=ACCESS_TOKEN_EXPIRE_SECONDS)
    
    access_token = create_access_token(
        data={
            "user_id": db_user.id,
            "email": db_user.email,
            "type": "business",
            "role": "business",
            "license_number": business.license_number
        },
        expires_delta=access_token_expires
    )
    
    # 6. Success: return the token and business data
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": business
    }

# ===== Public Read Endpoints (No JWT Required) =====

@router.get("/{license_number}", response_model=BusinessOut)
def get_business(license_number: str, db: Session = Depends(get_db)):
    """Gets business profile by license number (public endpoint)."""
    
    business = business_controller.get_business_by_license(db, license_number)
    
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    return business

@router.get("/{license_number}/operating-hours", response_model=List[OperatingHourOut])
def get_operating_hours(license_number: str, db: Session = Depends(get_db)):
    """Gets operating hours for a business (public endpoint)."""
    
    business = business_controller.get_business_by_license(db, license_number)
    
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    return business.operating_hours

@router.get("/{license_number}/menu-items", response_model=List[MenuItemOut])
def get_menu_items(license_number: str, db: Session = Depends(get_db)):
    """Gets menu items for a business (public endpoint)."""
    
    business = business_controller.get_business_by_license(db, license_number)
    
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    return business.menu_items

# ===== Protected Write Endpoints (JWT Required) =====

@router.patch("/{license_number}/profile", response_model=BusinessOut)
async def update_business_profile(
    license_number: str,
    db: Session = Depends(get_db),
    #license_number_from_token: str = Depends(get_current_license_number),
    stall_name: Optional[str] = Form(None),
    cuisine_type: Optional[str] = Form(None),
    establishment_address: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
):
    """Updates business profile information (requires JWT authentication)."""
    
    business_update = BusinessUpdate(
        stall_name=stall_name,
        cuisine_type=cuisine_type,
        establishment_address=establishment_address,
        description=description,
    )
    
    try:
        updated_business = await business_controller.update_business_profile(
            db, 
            license_number_from_path=license_number,
            # license_number_from_token=license_number_from_token,
            business_update=business_update,
            photo=photo
        )
        return updated_business
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error updating business profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update business profile"
        )

@router.put("/{license_number}/operating-hours", response_model=BusinessOut)
def set_operating_hours(
    license_number: str,
    hours_update: OperatingHoursUpdate,
    db: Session = Depends(get_db),
    #license_number_from_token: str = Depends(get_current_license_number)
):
    """Sets or replaces all operating hours for a business (requires JWT authentication)."""
    
    try:
        # Set operating hours with authorization check
        business_controller.set_operating_hours(
            db,
            license_number_from_path=license_number,
            #license_number_from_token=license_number_from_token,
            operating_hours=hours_update.operating_hours
        )
        
        # Return updated business with operating hours
        business = business_controller.get_business_by_license(db, license_number)
        return business
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error setting operating hours: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set operating hours"
        )

@router.post("/{license_number}/menu-items", response_model=MenuItemOut, status_code=status.HTTP_201_CREATED)
async def add_menu_item(
    license_number: str,
    db: Session = Depends(get_db),
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    #license_number_from_token: str = Depends(get_current_license_number)
):
    """Adds a single menu item to a business (requires JWT authentication)."""
    
    # Recreate the schema object to pass to the controller
    menu_item_in = MenuItemIn(
        name=name,
        price=price,
        description=description,
    )
    
    try:
        # Pass the text data schema AND the image file to the controller
        new_item = await business_controller.add_menu_item( # ⭐️ Await the async controller
            db,
            license_number_from_path=license_number,
            # license_number_from_token=license_number_from_token,
            menu_item=menu_item_in,
            image=image # Pass the UploadFile
        )
        return new_item
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error adding menu item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not add menu item"
        )

@router.patch("/{license_number}/menu-items/{item_id}", response_model=MenuItemOut)
async def update_menu_item(
    license_number: str,
    item_id: int,
    db: Session = Depends(get_db),
    name: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    new_image: Optional[UploadFile] = File(None),
    remove_current_image: Optional[bool] = Form(False),
    #license_number_from_token: str = Depends(get_current_license_number)
):
    """Updates a specific menu item (requires JWT authentication)."""
    
    # Recreate the schema object to pass to the controller
    menu_item_patch = MenuItemPatch(
        name=name,
        price=price,
        description=description,
    )
    
    try:
        # Pass the schema object, the file, and the flag to the controller
        updated_item = await business_controller.update_menu_item( # ⭐️ Await the async controller
            db,
            license_number_from_path=license_number,
            # license_number_from_token=license_number_from_token,
            item_id=item_id,
            menu_item=menu_item_patch, # Use the renamed variable in the router for clarity
            new_image=new_image, 
            remove_current_image=remove_current_image
        )
        
        if not updated_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Menu item not found"
            )
        
        return updated_item
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error updating menu item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update menu item"
        )

@router.delete("/{license_number}/menu-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(
    license_number: str,
    item_id: int,
    db: Session = Depends(get_db),
    #license_number_from_token: str = Depends(get_current_license_number)
):
    """Deletes a specific menu item from a business (requires JWT authentication)."""
    
    try:
        success = business_controller.delete_menu_item(
            db,
            license_number_from_path=license_number,
            #license_number_from_token=license_number_from_token,
            item_id=item_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Menu item not found or does not belong to this business"
            )
        
        return
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error deleting menu item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete menu item"
        )
