from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Literal, Optional, List
from datetime import datetime, time
from decimal import Decimal

# Business-specific Input Schema for Signup
class BusinessCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    user_type: Literal['business'] = 'business'
    license_number: str  # Required from SFA data
    stall_name: Optional[str] = None #Optional as some of our data don't have stall name. business name = stall name
    licensee_name: str #Do we need this?
    establishment_address: str
    hawker_centre: str
    postal_code: str
    description: Optional[str] = None
    photo: Optional[str] = None
    
    @field_validator('description')
    def validate_description_length(cls, v):
        if v and len(v.split()) > 100:
            raise ValueError('Description must not exceed 100 words')
        return v

# Business-specific Output Schema
class BusinessOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    user_type: Literal['business']
    license_number: str
    stall_name: Optional[str] = None
    status: str  # 'open' or 'closed'
    status_today_only: bool = False
    description: Optional[str] = None
    photo: Optional[str] = None
    establishment_address: Optional[str] = None
    hawker_centre: str
    postal_code: str
    created_at: Optional[datetime] = None
    operating_hours: Optional[List['OperatingHourOut']] = []
    menu_items: Optional[List['MenuItemOut']] = []
    
    model_config = ConfigDict(from_attributes=True)

# Business Update Schema (for Manage Stall Profile) - excludes license_number
class BusinessUpdate(BaseModel):
    stall_name: Optional[str] = None
    status: Optional[Literal['open', 'closed']] = None
    status_today_only: Optional[bool] = None  # Is closure temporary
    description: Optional[str] = None
    # Photo handled via multipart form upload, not in this schema
    
    @field_validator('description')
    def validate_description_length(cls, v):
        if v and len(v.split()) > 100:
            raise ValueError('Description must not exceed 100 words')
        return v

# Token response for business login
class Business_Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: BusinessOut

# Operating Hours Schema
class OperatingHourIn(BaseModel):
    day: Literal['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    start_time: time
    end_time: time
    
    @field_validator('end_time')
    def validate_time_order(cls, v, values):
        if 'start_time' in values.data and v <= values.data['start_time']:
            raise ValueError('End time must be after start time')
        return v

class OperatingHourOut(BaseModel):
    id: int
    day: str
    start_time: time
    end_time: time
    
    model_config = ConfigDict(from_attributes=True)

# Menu Item Schemas
class MenuItemIn(BaseModel):
    name: str = Field(..., max_length=100)
    price: Decimal = Field(..., decimal_places=2, ge=0)
    photo: Optional[str] = None

class MenuItemOut(BaseModel):
    id: int
    name: str
    price: Decimal
    photo: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class MenuItemPatch(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    price: Optional[Decimal] = Field(None, ge=0)
    photo: Optional[str] = None

# Bulk update for operating hours
class OperatingHoursUpdate(BaseModel):
    operating_hours: List[OperatingHourIn]

# Bulk update for menu items
class MenuItemsUpdate(BaseModel):
    menu_items: List[MenuItemIn]