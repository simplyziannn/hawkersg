from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Favourite(Base):
    __tablename__ = "favourites"

    id = Column(Integer, primary_key=True, index=True)
    consumer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String, nullable=False)
    target_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # This allows you to access the Consumer object from a Favourite object.
    # 'Consumer' is the class name of the target model.
    consumer = relationship("Consumer", back_populates="favourites")
