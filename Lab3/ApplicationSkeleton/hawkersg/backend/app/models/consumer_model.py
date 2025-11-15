from app.models.user_model import User
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

# The Consumer class inheriting from User
class Consumer(User):
    __tablename__ = "consumers"
    id = Column(Integer, ForeignKey('users.id'), primary_key=True) 

    # Consumer-specific field
    profile_pic = Column(String, nullable=True)
    recentlySearch = Column(String, default="")

    favourites = relationship("Favourite", back_populates="consumer", 
        # Optional: Set lazy='joined' or 'selectin' for more efficient loading 
        # when fetching a Consumer and their favourites.
        lazy="selectin" 
    )

    reviews = relationship("Review", back_populates="consumer", lazy="selectin")

    __mapper_args__ = {
        "polymorphic_identity": "consumer",
    }
