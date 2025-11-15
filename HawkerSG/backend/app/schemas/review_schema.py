from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Literal, Optional, List
from datetime import datetime

TargetType = Literal["business", "hawker"]

class ReviewIn(BaseModel):
    target_type: TargetType
    target_id: int
    star_rating: int = Field(..., ge=1, le=5)  # 1..5
    description: Optional[str] = Field(default="", max_length=250)
    images: Optional[List[str]] = None  # store as list; service serializes

    @field_validator("description")
    @classmethod
    def trim_description(cls, v: Optional[str]) -> str:
        return (v or "").strip()

"""class ReviewUpdate(BaseModel):
    # allow partial update
    star_rating: Optional[int] = Field(default=None, ge=1, le=5)
    description: Optional[str] = Field(default=None, max_length=250)
    images: Optional[List[str]] = None
"""
class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True) 
    
    id: int
    consumer_id: int
    target_type: TargetType
    target_id: int
    star_rating: int
    description: str
    images: List[str]
    created_at: datetime
    updated_at: datetime

    @field_validator("images", mode="before")
    @classmethod
    def split_images_string(cls, v: Optional[str]) -> List[str]:
        """Converts the pipe-delimited string from the database back to a list."""
        if isinstance(v, str):
            # Split by '|' and filter out empty strings (in case the field is empty)
            return [p for p in v.split("|") if p]
        
        # If it's already a list (e.g., if passed directly), or None, return as is
        return v if isinstance(v, list) else []
