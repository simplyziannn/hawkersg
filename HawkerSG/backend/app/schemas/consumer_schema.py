from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Literal, Optional
from datetime import datetime

class SearchHistoryRequest(BaseModel):
    search_term: str

# Consumer-specific Input Schema
class ConsumerCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    user_type: Literal['consumer']

# Consumer-specific Output Schema
class ConsumerOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    user_type: Literal['consumer']
    created_at: Optional[datetime] = None
    profile_pic: Optional[str] = None
    recentlySearch: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- JWT Output Schema ---
class Consumer_Token(BaseModel):
    access_token: str
    token_type: str
    user: ConsumerOut

class UpdateProfileResponse(BaseModel):
    message: str
    user: ConsumerOut