import requests
import time
import os
import json
from typing import Optional, Tuple
from datetime import datetime

ONEMAP_EMAIL = os.getenv("ONEMAP_EMAIL") 
ONEMAP_PASSWORD = os.getenv("ONEMAP_PASSWORD")
ONEMAP_TOKEN_URL = "https://www.onemap.gov.sg/api/auth/post/getToken"

TOKEN_CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".onemap_token_cache.json")
SAFETY_BUFFER_SECONDS = 3600

_cached_token: Optional[str] = None
_token_expiry_timestamp: int = 0

def _read_token_cache() -> Tuple[Optional[str], int]:
    """Reads the token and expiry timestamp from the cache file."""
    if not os.path.exists(TOKEN_CACHE_FILE):
        return None, 0
    try:
        with open(TOKEN_CACHE_FILE, 'r') as f:
            data = json.load(f)
            token = data.get('access_token')
            expiry = data.get('expiry_timestamp')
        
            # If expiry exists, convert it to an integer. If not, default to 0.
            if expiry is not None:
                expiry = int(expiry) 
            else:
                expiry = 0
                
            return token, expiry
    except (IOError, json.JSONDecodeError, ValueError) as e:
        print(f"Error reading or decoding token cache file. Deleting file for safety. Error: {e}")
        # If the file is corrupted, delete it and treat the cache as invalid
        try:
            os.remove(TOKEN_CACHE_FILE)
        except OSError:
            pass
        return None, 0

def _write_token_cache(token: str, expiry_timestamp: int):
    """
    Writes the new token and expiry timestamp to the cache file, 
    ensuring the directory structure exists first.
    """
    # Create the parent directory if it doesn't exist
    os.makedirs(os.path.dirname(TOKEN_CACHE_FILE), exist_ok=True)
    
    data = {
        'access_token': token,
        'expiry_timestamp': expiry_timestamp, # Should be an integer here
        'cached_at': datetime.now().isoformat()
    }
    try:
        with open(TOKEN_CACHE_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except IOError as e:
        print(f"Error writing to token cache file: {e}")

def _get_new_onemap_token() -> dict:
    """Authenticates to OneMap to get a fresh token."""
    if not ONEMAP_EMAIL or not ONEMAP_PASSWORD:
        # NOTE: This error requires fixing your backend's .env file
        raise ValueError("OneMap credentials (EMAIL/PASSWORD) not set in backend environment variables.")

    payload = {"email": ONEMAP_EMAIL, "password": ONEMAP_PASSWORD}
    headers = {"Content-Type": "application/json"}
    response = requests.post(ONEMAP_TOKEN_URL, headers=headers, data=json.dumps(payload))
    response.raise_for_status()
    return response.json()

def get_onemap_token() -> Optional[str]:
    """
    Returns a valid (and refreshed, if needed) OneMap access token, 
    checking the in-memory and file cache before requesting a new one.
    """
    global _cached_token, _token_expiry_timestamp
    
    # --- 1. Check In-Memory Cache (Fastest) ---
    # The comparison only works if _token_expiry_timestamp is an int/float
    if _cached_token and _token_expiry_timestamp > time.time() + SAFETY_BUFFER_SECONDS: 
        return _cached_token

    # --- 2. Check Persistent File Cache (On Server Restart) ---
    if not _cached_token:
        # This will load a valid token (int expiry) or None, 0 if invalid/missing
        _cached_token, _token_expiry_timestamp = _read_token_cache()
        
        # Re-check the validity of the token loaded from the file
        if _cached_token and _token_expiry_timestamp > time.time() + SAFETY_BUFFER_SECONDS:
            print("Loaded valid token from cache file.")
            return _cached_token

    # --- 3. Request New Token (Last Resort) ---
    print("Token invalid or nearly expired. Requesting new token from OneMap...")
    try:
        data = _get_new_onemap_token()
        new_token = data.get('access_token')
        new_expiry = data.get('expiry_timestamp')
        
        if new_token and new_expiry:
            # FIX: Ensure new_expiry is converted to an integer immediately after API retrieval
            try:
                new_expiry_int = int(new_expiry)
            except (TypeError, ValueError):
                print("Warning: OneMap expiry_timestamp not convertible to integer. Using 0.")
                new_expiry_int = 0
            
            _cached_token = new_token
            _token_expiry_timestamp = new_expiry_int # Assign the clean integer
            _write_token_cache(new_token, new_expiry_int) # Save the clean integer
            print("Successfully refreshed and cached new token.")
            return new_token
        else:
            raise Exception("New token response did not contain required fields.")
            
    except Exception as e:
        print(f"🛑 Failed to fetch or cache OneMap token: {e}")
        return None
