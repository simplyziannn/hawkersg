from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.utils.jwt_utils import decode_access_token

# Define the OAuth2 scheme (FastAPI standard for JWT/Bearer tokens)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/consumer/login") 

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    """
    Extracts and validates the user ID from the Authorization: Bearer <token> header.
    """
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id") 
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user ID.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Ensure ID is an integer
    try:
        return int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload contains invalid user ID format.",
            headers={"WWW-Authenticate": "Bearer"},
        )
