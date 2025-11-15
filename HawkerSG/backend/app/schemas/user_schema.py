from pydantic import BaseModel, EmailStr, Field
from typing import Literal

# User Input Schema for Login
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    #user_type: Literal['consumer', 'business'] #Removed because we want the URL to dictate user_type, not for user to enter manuallyuser_type: Literal['consumer', 'business']

# Schemas for password reset
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetData(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
