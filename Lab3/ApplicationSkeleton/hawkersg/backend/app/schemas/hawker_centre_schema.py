from pydantic import BaseModel, Field

class Coordinates(BaseModel):
    """Schema for latitude and longitude."""
    lat: float = Field(..., description="Latitude coordinate.")
    lng: float = Field(..., description="Longitude coordinate.")

class HawkerCentreResponse(BaseModel):
    """
    The final format for hawker centre data returned to the client.
    Matches the requested format: id, name, address, description, image, 
    rating, stallCount, and grouped coordinates.
    """
    id: int
    name: str
    address: str
    description: str
    image: str
    rating: float
    stallCount: int
    coordinates: Coordinates

    class Config:
        # Allows conversion from ORM objects (like HawkerCentre) to this schema
        from_attributes = True