from pydantic import BaseModel, field_validator, ConfigDict
from typing import Literal, Optional
from datetime import datetime

TargetType = Literal["business", "hawkercentre", "stall"]

class FavouriteIn(BaseModel):
    target_type: TargetType
    target_id: int

class FavouriteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True) 

    consumer_id: int
    target_type: TargetType
    target_id: int
    created_at: Optional[datetime] = None

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_iso(cls, v):
        if isinstance(v, str) and v.endswith("Z"):
            from datetime import datetime
            try:
                return datetime.fromisoformat(v.rstrip("Z"))
            except Exception:
                return None
        return v