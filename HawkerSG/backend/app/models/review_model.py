from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)

    consumer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    target_type = Column(String(50), nullable=False)
    target_id = Column(Integer, nullable=False)
    
    star_rating = Column(Integer, nullable=False)
    description = Column(String(250), nullable=False, default="") 
    images = Column(Text, nullable=False, default="") 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    consumer = relationship("Consumer", back_populates="reviews") 
    
    # Add a unique constraint to ensure a user can only review a specific target once
    # Optional, but often a good idea for reviews:
    # __table_args__ = (
    #     UniqueConstraint('consumer_id', 'target_type', 'target_id', name='_consumer_target_uc'),
    # )