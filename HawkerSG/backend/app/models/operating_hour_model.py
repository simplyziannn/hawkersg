from app.database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, Time
from sqlalchemy.orm import relationship
import enum

class DayOfWeek(enum.Enum):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"

class OperatingHour(Base):
    __tablename__ = "operating_hours"
    
    id = Column(Integer, primary_key=True, index=True)
    license_number = Column(String, ForeignKey('businesses.license_number'), nullable=False)
    day = Column(String, nullable=False)  # Mon-Sun
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # Relationship back to Business
    business = relationship("Business", back_populates="operating_hours")
    
    # Note: Start < End validation should be done at controller/schema level