from app.database import Base
from sqlalchemy import Column, Integer, String, Float, Text
from sqlalchemy.orm import relationship

class HawkerCentre(Base):
    __tablename__ = "hawker_centres"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False) 
    
    address = Column(Text, nullable=False) # Formatted Address
    description = Column(Text, default="")
    image = Column(String, default="") # PhotoURL from CSV
    rating = Column(Float, default=0.0)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # # Relationship to the businesses located here (One-to-Many)
    # businesses = relationship("Business", back_populates="hawker_centre_rel")