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


class Business(User):
    __tablename__ = "businesses"
    
    id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    
    # Core business identifiers
    license_number = Column(String, unique=True, index=True, nullable=False)  # From SFA data
    stall_name = Column(String, nullable=True) # From SFA data - can be empty
    licensee_name = Column(String, nullable=False)  # From SFA data - notNull
    
    # Profile details
    description = Column(String(1000), nullable=True)  # ~100 words
    status = Column(Enum(StallStatus), default=StallStatus.OPEN)
    status_today_only = Column(Boolean, default=False)  # For temporary closures
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
    
    def reset_daily_status(self):
        """Reset status if it was set to 'today only' and day has changed"""
        if self.status_today_only and self.status_updated_at:
            if self.status_updated_at.date() < datetime.now().date():
                self.status = StallStatus.OPEN
                self.status_today_only = False
                self.status_updated_at = None

                
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