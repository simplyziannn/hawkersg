import csv, os
from datetime import datetime
from typing import List, Dict, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "data")
REVIEWS_CSV = os.path.join(DATA_DIR, "reviews.csv")
CSV_HEADERS = [
    "id", "consumer_id", "target_type", "target_id",
    "star_rating", "description", "images", "created_at", "updated_at"
]

os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(REVIEWS_CSV):
    with open(REVIEWS_CSV, "w", newline="", encoding="utf-8") as f:
        csv.DictWriter(f, fieldnames=CSV_HEADERS).writeheader()

def _read_all() -> List[Dict[str, str]]:
    with open(REVIEWS_CSV, "r", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def _write_all(rows: List[Dict[str, str]]) -> None:
    tmp = REVIEWS_CSV + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        w.writeheader()
        w.writerows(rows)
    os.replace(tmp, REVIEWS_CSV)

def _next_id(rows: List[Dict[str, str]]) -> int:
    return (max([int(r["id"]) for r in rows], default=0) + 1)

def _now() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def create(consumer_id: int, target_type: str, target_id: int,
           star_rating: int, description: str, images: Optional[List[str]]) -> Dict[str, str]:
    rows = _read_all()
    rid = _next_id(rows)
    row = {
        "id": str(rid),
        "consumer_id": str(consumer_id),
        "target_type": target_type,
        "target_id": str(target_id),
        "star_rating": str(star_rating),
        "description": description or "",
        "images": "|".join(images or []),  # pipe-delimited
        "created_at": _now(),
        "updated_at": _now(),
    }
    rows.append(row)
    _write_all(rows)
    return row

def update(review_id: int, consumer_id: int,
           star_rating: Optional[int], description: Optional[str], images: Optional[List[str]]) -> Optional[Dict[str, str]]:
    rows = _read_all()
    found = None
    for r in rows:
        if int(r["id"]) == review_id and int(r["consumer_id"]) == consumer_id:
            if star_rating is not None: r["star_rating"] = str(star_rating)
            if description is not None: r["description"] = description
            if images is not None: r["images"] = "|".join(images)
            r["updated_at"] = _now()
            found = r
            break
    if found:
        _write_all(rows)
    return found

def delete(review_id: int, consumer_id: int) -> bool:
    rows = _read_all()
    new_rows = [r for r in rows if not (int(r["id"]) == review_id and int(r["consumer_id"]) == consumer_id)]
    changed = len(new_rows) != len(rows)
    if changed: _write_all(new_rows)
    return changed

def list_for_target(target_type: str, target_id: int) -> List[Dict[str, str]]:
    rows = _read_all()
    out = [r for r in rows if r["target_type"] == target_type and int(r["target_id"]) == target_id]
    # newest first
    return sorted(out, key=lambda r: r["created_at"], reverse=True)

def list_for_consumer(consumer_id: int) -> List[Dict[str, str]]:
    rows = _read_all()
    out = [r for r in rows if int(r["consumer_id"]) == consumer_id]
    return sorted(out, key=lambda r: r["created_at"], reverse=True)

def avg_rating(target_type: str, target_id: int) -> Optional[float]:
    rs = list_for_target(target_type, target_id)
    if not rs: return None
    s = sum(int(r["star_rating"]) for r in rs)
    return round(s / len(rs), 2)
