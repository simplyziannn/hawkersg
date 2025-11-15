from app.models.user_model import User
from app.database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Boolean, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from datetime import datetime, time
import pytz

class StallStatus(enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class CuisineType(str, enum.Enum):
    chinese = "Chinese"
    malay = "Malay"
    indian = "Indian"
    western = "Western"
    japanese = "Japanese"
    thai = "Thai"
    vietnamese = "Vietnamese"
    korean = "Korean"
    others = "Others"
    
class Business(User):
    __tablename__ = "businesses"
    
    id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    
    # Core business identifiers
    license_number = Column(String, unique=True, index=True, nullable=False)  # From SFA data
    stall_name = Column(String, nullable=True) # From SFA data - can be empty
    licensee_name = Column(String, nullable=False)  # From SFA data - notNull
    
    # Profile details
    cuisine_type = Column(Enum(CuisineType), nullable=True)
    description = Column(String(500), nullable=True)  # 500 characters
    status = Column(Enum(StallStatus), default=StallStatus.OPEN)
    status_updated_at = Column(DateTime, nullable=True)
    
    # Location info
    establishment_address = Column(String, nullable=False)  # From SFA data
    hawker_centre = Column(String, nullable=False)  # From SFA data
    postal_code = Column(String, nullable=False)  # From SFA data
    
    # Media
    photo = Column(String, nullable=True)  # Store filename/path to photo
    
    # Relationships
    operating_hours = relationship("OperatingHour", back_populates="business", cascade="all, delete-orphan")
    menu_items = relationship("MenuItem", back_populates="business", cascade="all, delete-orphan")
    # Future relationships (scaffolded):
    # reviews = relationship("Review", back_populates="business")
    # favourites = relationship("Favourite", back_populates="business")
    
    __mapper_args__ = {
        "polymorphic_identity": "business",
    }
    

                
    def is_currently_open(self):
        """Check if stall is open based on today's operating hours"""
        now = datetime.now(pytz.timezone("Asia/Singapore"))
        current_day = now.strftime("%A").lower()  # e.g. 'monday'

        for hours in self.operating_hours:
            if hours.day_of_week.lower() == current_day:
                if hours.closed:
                    return False
                try:
                    open_time = datetime.strptime(hours.open_time, "%H:%M").time()
                    close_time = datetime.strptime(hours.close_time, "%H:%M").time()
                except Exception:
                    return False
                return open_time <= now.time() <= close_time
        return False