import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.hawker_centre_model import HawkerCentre
from app.utils.onemap_token_manager import get_onemap_token

router = APIRouter(
    prefix="/hawkers",
    tags=["Hawkers"]
)

@router.get("/")
def get_all_hawkers(db: Session = Depends(get_db)):
    """Return all hawker centres from the database."""
    hawkers = db.query(HawkerCentre).all()
    if not hawkers:
        raise HTTPException(status_code=404, detail="No hawker centres found in the database")
    return hawkers

@router.get("/planning-area", response_model=str)
async def get_planning_area_proxy(
    latitude: float = Query(..., description="WGS84 Latitude"),
    longitude: float = Query(..., description="WGS84 Longitude")
):
    """
    Proxies the OneMap GetPlanningArea API call securely using a backend-managed token.
    """
    # 1. Get the current, valid token from the secure backend cache/manager
    token = get_onemap_token()
    if not token:
        # 503 Service Unavailable is appropriate if an external dependency fails
        raise HTTPException(status_code=503, 
                            detail="Service Unavailable: Failed to retrieve secure OneMap token.")
        
    # 2. Construct the external OneMap API request URL
    PLANNING_AREA_URL = (
        f"https://www.onemap.gov.sg/api/public/popapi/getPlanningarea"
        f"?latitude={latitude}&longitude={longitude}"
    )
    
    headers = {
        "Authorization": token  # The secure, refreshed token is added here
    }

    # 3. Make the request to OneMap
    try:
        response = requests.get(PLANNING_AREA_URL, headers=headers)
        
        # Check for 401 Unauthorized (which shouldn't happen if get_onemap_token works, but as a safeguard)
        if response.status_code == 401:
            raise HTTPException(status_code=500, detail="Internal Token Error: OneMap token may have expired unexpectedly.")
            
        response.raise_for_status() # Raise for other HTTP errors (4xx/5xx)
        data = response.json()
        
        # 4. Process the response data just like the frontend did (best to do this on the backend)
        if data and isinstance(data, list) and data[0].get('pln_area_n'):
            areaName = data[0]['pln_area_n']
            # Format the area name from ALL CAPS (e.g., "YISHUN") to Title Case ("Yishun")
            formatted_area = ' '.join(
                [word.capitalize() for word in areaName.lower().split()]
            )
            return formatted_area
        
        return "Singapore" # Fallback if no specific planning area found

    except requests.exceptions.RequestException as e:
        print(f"Error calling OneMap GetPlanningArea: {e}")
        # Return a generic error to the frontend
        raise HTTPException(status_code=500, detail="External map service failed.")

@router.get("/{hawker_id}")
def get_hawker_by_id(hawker_id: int, db: Session = Depends(get_db)):
    """Return a single hawker centre by its ID."""
    hawker = db.query(HawkerCentre).filter(HawkerCentre.id == hawker_id).first()
    if not hawker:
        raise HTTPException(status_code=404, detail="Hawker centre not found")
    return hawker
