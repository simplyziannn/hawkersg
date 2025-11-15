from pydantic import BaseModel, EmailStr, field_validator
from typing import Literal, Optional, List
from datetime import datetime

class SearchHistoryRequest(BaseModel):
    search_term: str

# Consumer-specific Input Schema
class ConsumerCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    user_type: Literal['consumer'] # Enforce type for this schema

# Consumer-specific Output Schema
class ConsumerOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    user_type: Literal['consumer']
    created_at: Optional[datetime] = None
    profile_pic: Optional[str] = None
    recentlySearch: Optional[str] = None

    class Config:
        from_attributes = True

# --- JWT Output Schema ---
class Consumer_Token(BaseModel):
    access_token: str
    token_type: str
    user: ConsumerOut

class UpdateProfileResponse(BaseModel):
    message: str
    user: ConsumerOut # <--- Nest the ORM-enabled schema here