from app.database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, Numeric
from sqlalchemy.orm import relationship

class MenuItem(Base):
    __tablename__ = "menu_items"
    
    id = Column(Integer, primary_key=True, index=True)
    license_number = Column(String, ForeignKey('businesses.license_number'), nullable=False)
    description = Column(String(200), nullable=True) #200 characters limit
    name = Column(String(100), nullable=False)  # 100 characters limit
    price = Column(Numeric(10, 2), nullable=False)  # Decimal with 2 decimal places
    photo = Column(String, nullable=True)  # URL/path to menu item photo
    
    # Relationship back to Business
    business = relationship("Business", back_populates="menu_items")
