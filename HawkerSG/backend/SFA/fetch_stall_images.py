import os, re, time, json
from pathlib import Path
import requests
import pandas as pd
from slugify import slugify

# ---- CONFIG ----
INPUT_DIR  = Path("hawkersg/backend/SFA/centres_output")
OUTPUT_DIR = Path("hawkersg/backend/SFA/stall_images")
BING_KEY   = os.environ.get("BING_KEY")
BING_ENDPOINT = "https://api.bing.microsoft.com/v7.0/images/search"
PER_FILE_LIMIT = None       # set an int to limit stalls per file during testing
DELAY_SEC = 0.7             # gentle rate limiting
MIN_W, MIN_H = 500, 350     # minimum image size to accept

# ---- HELPERS ----
def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)

def guess_ext(url: str) -> str:
    m = re.search(r"\.(jpg|jpeg|png|webp)(?:\?|$)", url, re.I)
    return (m.group(1) if m else "jpg").lower()

def safe_name(s: str) -> str:
    return slugify(s, lowercase=True, max_length=90)

def bing_search(query: str, market="en-SG", safe="Moderate"):
    headers = {"Ocp-Apim-Subscription-Key": BING_KEY}
    params  = {"q": query, "mkt": market, "safeSearch": safe, "count": 10, "imageType": "Photo"}
    r = requests.get(BING_ENDPOINT, headers=headers, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

def choose_image(payload: dict):
    vals = payload.get("value", [])
    # prefer larger images first
    vals.sort(key=lambda x: (x.get("width",0)*x.get("height",0)), reverse=True)
    for item in vals:
        w, h = item.get("width",0), item.get("height",0)
        if w >= MIN_W and h >= MIN_H and item.get("contentUrl"):
            return item
    return vals[0] if vals else None

def download(url: str, outpath: Path) -> bool:
    try:
        with requests.get(url, stream=True, timeout=30) as r:
            r.raise_for_status()
            with open(outpath, "wb") as f:
                for chunk in r.iter_content(8192):
                    if chunk:
                        f.write(chunk)
        return outpath.stat().st_size > 10_000
    except Exception:
        return False

def get_hawker_name_from_df_or_filename(df: pd.DataFrame, xlsx_path: Path) -> str:
    # Try column first (some files have "Hawker Centre")
    for col in df.columns:
        if str(col).strip().lower() == "hawker centre":
            val = df[col].dropna().astype(str).str.strip()
            if len(val) > 0:
                return val.iloc[0]
    # Fallback: derive from filename after first underscore
    base = xlsx_path.stem
    parts = base.split("_", 1)
    return parts[1] if len(parts) > 1 else base

# ---- MAIN ----
def main():
    assert BING_KEY, "BING_KEY env var is not set."

    ensure_dir(OUTPUT_DIR)
    misses = []

    xlsx_files = sorted(INPUT_DIR.glob("*.xlsx"))
    for xfile in xlsx_files:
        try:
            df = pd.read_excel(xfile, engine="openpyxl")
        except Exception as e:
            misses.append({"file": xfile.name, "stall": None, "reason": f"read_error:{type(e).__name__}"})
            continue

        # Normalize headers
        df.columns = [str(c).strip() for c in df.columns]
        # Find the Business Name column (exact match preferred, fallback to fuzzy)
        bn_col = None
        for c in df.columns:
            if c.lower() == "business name":
                bn_col = c; break
        if not bn_col:
            for c in df.columns:
                if "business" in c.lower() and "name" in c.lower():
                    bn_col = c; break
        if not bn_col:
            misses.append({"file": xfile.name, "stall": None, "reason": "no_business_name_col"})
            continue

        hawker_name = get_hawker_name_from_df_or_filename(df, xfile)
        hawker_dir  = OUTPUT_DIR / safe_name(hawker_name)
        ensure_dir(hawker_dir)

        count = 0
        for stall in df[bn_col].astype(str).tolist():
            stall = stall.strip()
            if not stall or stall.lower() in {"nan", "none", "-"}:
                continue

            # Skip if already downloaded
            existing = list(hawker_dir.glob(f"{safe_name(stall)}.*"))
            if any(p.suffix.lower() in {".jpg",".jpeg",".png",".webp"} for p in existing):
                if PER_FILE_LIMIT and count >= PER_FILE_LIMIT: break
                continue

            query = f"{stall} {hawker_name} Singapore stall"
            try:
                payload = bing_search(query)
                item = choose_image(payload)
                if not item:
                    misses.append({"file": xfile.name, "stall": stall, "reason": "no_results"})
                    time.sleep(DELAY_SEC); continue

                url = item.get("contentUrl") or item.get("hostPageUrl")
                ext = guess_ext(url)
                out = hawker_dir / f"{safe_name(stall)}.{ext}"

                ok = download(url, out)
                if not ok and item.get("thumbnailUrl"):
                    ok = download(item["thumbnailUrl"], out)

                if not ok:
                    misses.append({"file": xfile.name, "stall": stall, "reason": "download_failed", "url": url})
                else:
                    # save tiny attribution sidecar
                    meta = {
                        "query": query,
                        "sourceUrl": url,
                        "width": item.get("width"),
                        "height": item.get("height"),
                        "thumbnailUrl": item.get("thumbnailUrl"),
                        "bing_insights": {k: item.get(k) for k in ("name","hostPageDisplayUrl","contentSize")}
                    }
                    with open(out.with_suffix(out.suffix + ".json"), "w") as f:
                        json.dump(meta, f, indent=2)
                    count += 1

            except requests.HTTPError as e:
                misses.append({"file": xfile.name, "stall": stall, "reason": f"http_{e.response.status_code}"})
            except Exception as e:
                misses.append({"file": xfile.name, "stall": stall, "reason": f"exception_{type(e).__name__}"})

            time.sleep(DELAY_SEC)
            if PER_FILE_LIMIT and count >= PER_FILE_LIMIT: break

    # Write report
    with open(OUTPUT_DIR / "_stall_image_report.json", "w") as f:
        json.dump(misses, f, indent=2)
    print(f"Done. Misses logged to {OUTPUT_DIR / '_stall_image_report.json'}")

if __name__ == "__main__":
    main()
