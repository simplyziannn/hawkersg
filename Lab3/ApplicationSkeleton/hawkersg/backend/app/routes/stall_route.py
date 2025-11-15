# app/routes/stall_route.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, time
import pytz

from app.database import get_db
from app.models.business_model import Business, StallStatus
from app.models.operating_hour_model import OperatingHour

router = APIRouter(prefix="/stalls", tags=["Stalls"])

SG_TZ = pytz.timezone("Asia/Singapore")
DAY_MAP = {
    0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday",
    4: "Friday", 5: "Saturday", 6: "Sunday"
}

def now_sg():
    return datetime.now(SG_TZ)

def is_business_open(biz: Business, db: Session) -> bool:
    """Return True if current SG time is within today's operating window(s)."""
    # hard override by status_today_only
    if biz.status_today_only:
        return biz.status == StallStatus.OPEN

    today = now_sg()
    day_name = DAY_MAP[today.weekday()]
    # get all windows today
    windows = db.query(OperatingHour).filter(
        OperatingHour.license_number == biz.license_number,
        OperatingHour.day == day_name
    ).all()

    if not windows:
        # fall back to status enum if no hours recorded
        return biz.status == StallStatus.OPEN

    tnow = today.time()
    for w in windows:
        start: time = w.start_time
        end: time = w.end_time
        if start <= tnow <= end:
            return True
    return False

def business_to_dto(biz: Business, db: Session):
    return {
        "id": biz.id,
        "license_number": biz.license_number,
        "stall_name": biz.stall_name or biz.licensee_name or "",
        "licensee_name": biz.licensee_name,
        "description": biz.description or "",
        "status": biz.status.name,
        "is_open": is_business_open(biz, db),
        "establishment_address": biz.establishment_address or "",
        "hawker_centre": biz.hawker_centre or "",
        "postal_code": biz.postal_code or "",
        "photo": biz.photo or "",
        # optional placeholders your FE maps:
        "rating": 0,
        "review_count": 0,
        # include raw hours if FE ever wants to draw them:
        # "hours": [{"day": oh.day, "start": oh.start_time.isoformat(), "end": oh.end_time.isoformat()} for oh in biz.operating_hours],
    }

@router.get("/", response_model=list[dict])
def get_all_stalls(db: Session = Depends(get_db)):
    stalls = db.query(Business).all()
    return [business_to_dto(b, db) for b in stalls]

@router.get("/{stall_id}", response_model=dict)
def get_stall_by_id(stall_id: int, db: Session = Depends(get_db)):
    biz = db.query(Business).filter(Business.id == stall_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="Stall not found")
    return business_to_dto(biz, db)