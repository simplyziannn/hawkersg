from app.database import Base
from sqlalchemy import Column, Integer, String, DateTime, text

# The Base class that holds common fields
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    username = Column(String)
    user_type = Column(String) # Discriminator column
    reset_token = Column(String, nullable=True)
    token_expires = Column(DateTime, nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=text('CURRENT_TIMESTAMP') 
    )

    # Link for inheritance
    __mapper_args__ = {
        "polymorphic_identity": "user",
        "polymorphic_on": user_type
    }
