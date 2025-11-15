from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
import logging

# Configure basic logging to ensure messages show up
# Uvicorn usually handles this, but it's good practice to set a handler
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv()

SECRET_KEY = os.environ.get("SECRET_KEY", "YOUR_SUPER_SECURE_DEFAULT_KEY_CHANGE_ME")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_SECONDS = int(os.environ.get("ACCESS_TOKEN_EXPIRE_SECONDS", 1800))

if not SECRET_KEY or SECRET_KEY == "YOUR_SUPER_SECURE_DEFAULT_KEY_CHANGE_ME":
    # IMPORTANT: Raise an error or log a warning if the secret key is not set
    print("WARNING: SECRET_KEY not properly set in environment variables!")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a new JWT access token."""
    to_encode = data.copy()

    if 'exp' in to_encode:
        del to_encode['exp']

    current_time_utc = datetime.now(timezone.utc)

    if expires_delta:
        expire = current_time_utc + expires_delta
    else:
        expire = current_time_utc + timedelta(seconds=ACCESS_TOKEN_EXPIRE_SECONDS)

    # --- LOGGING THE EXPIRATION TIME ---
    logging.info(f"JWT Expiration Time (UTC): {expire.isoformat()}")
    
    expire_sgt = expire.astimezone(timezone(timedelta(hours=8)))
    logging.info(f"JWT Expiration Time (SGT): {expire_sgt.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Standard JWT claims
    to_encode.update({"exp": expire, "sub": "access"}) 

    logging.info(f"Final JWT Payload (to_encode): {to_encode}")
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    try:
        check_payload = jwt.decode(encoded_jwt, SECRET_KEY, algorithms=[ALGORITHM], 
                                   options={"verify_exp": False})
        logging.info(f"✅ Newly Encoded Token Payload Check: {check_payload}")
        
        # 2. Re-log the final string
        logging.info(f"✅ Final Encoded JWT String: {encoded_jwt}")

    except Exception as e:
        logging.error(f"Failed to verify newly encoded token: {e}")
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT access token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None