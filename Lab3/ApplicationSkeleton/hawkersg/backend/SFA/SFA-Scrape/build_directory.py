import os, json

OUTPUT_DIR = "centres_output"
INDEX_FILE = "index.json"

index = []

for fname in os.listdir(OUTPUT_DIR):
    if fname.endswith(".csv") or fname.endswith(".xlsx"):   # 👈 allow Excel too
        # split postal and centre name
        postal, centre = fname.rsplit("_", 1)  # split at last underscore
        centre = centre.replace(".csv", "").replace(".xlsx", "")
        index.append({
            "postal": postal,
            "hawker_centre": centre,
            "file": os.path.join(OUTPUT_DIR, fname)
        })

with open(INDEX_FILE, "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print(f"✅ Built {INDEX_FILE} with {len(index)} entries")
