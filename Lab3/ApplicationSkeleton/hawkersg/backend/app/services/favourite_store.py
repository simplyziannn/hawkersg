import csv, os
from datetime import datetime
from typing import List, Dict

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "data")
FAV_CSV = os.path.join(DATA_DIR, "favourites.csv")
CSV_HEADERS = ["consumer_id", "target_type", "target_id", "created_at"]

os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(FAV_CSV):
    with open(FAV_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()

def _read_all() -> List[Dict[str, str]]:
    with open(FAV_CSV, "r", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def _write_all(rows: List[Dict[str, str]]) -> None:
    tmp = FAV_CSV + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
    os.replace(tmp, FAV_CSV)

def list_by_consumer(consumer_id: int) -> List[Dict[str, str]]:
    cid = str(consumer_id)
    return [r for r in _read_all() if r["consumer_id"] == cid]

def is_favourite(consumer_id: int, target_type: str, target_id: int) -> bool:
    cid, tid = str(consumer_id), str(target_id)
    for r in _read_all():
        if r["consumer_id"] == cid and r["target_type"] == target_type and r["target_id"] == tid:
            return True
    return False

def add(consumer_id: int, target_type: str, target_id: int) -> bool:
    if is_favourite(consumer_id, target_type, target_id):
        return False
    rows = _read_all()
    rows.append({
        "consumer_id": str(consumer_id),
        "target_type": target_type,
        "target_id": str(target_id),
        "created_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    })
    _write_all(rows)
    return True

def remove(consumer_id: int, target_type: str, target_id: int) -> bool:
    cid, ttype, tid = str(consumer_id), target_type, str(target_id)
    rows = _read_all()
    new_rows = [r for r in rows if not (r["consumer_id"] == cid and r["target_type"] == ttype and r["target_id"] == tid)]
    changed = len(new_rows) != len(rows)
    if changed:
        _write_all(new_rows)
    return changed
