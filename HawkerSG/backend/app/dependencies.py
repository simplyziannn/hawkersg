from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from app.utils.jwt_utils import decode_access_token

# Define the OAuth2 scheme (FastAPI standard for JWT/Bearer tokens)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/consumer/login", scheme_name="ConsumerAuth")
business_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/business/login", scheme_name="BusinessAuth")
#bearer_scheme = HTTPBearer()

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    """
    Extracts and validates the user ID from the Authorization: Bearer <token> header.
    Used for consumer authentication.
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

def get_current_license_number(token: str = Depends(business_oauth2_scheme)) -> str:
    """
    Extracts and validates the license number from the Authorization: Bearer <token> header.
    Used for business authentication.
    """
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if this is a business token
    user_type = payload.get("type") or payload.get("role")
    if user_type != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint requires business authentication.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    license_number = payload.get("license_number")
    
    if license_number is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing license number.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return str(license_number)