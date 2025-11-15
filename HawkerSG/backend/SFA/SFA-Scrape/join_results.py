import os
import pandas as pd

SFA_RESULTS = "sfa_results.csv"
CENTRES = "hawker_centres.csv"
OUTPUT = "merged_results.csv"
OUTPUT_DIR = "centres_output"

# --- Step 1: Load both files ---
centres_df = pd.read_csv(CENTRES, dtype=str)
stalls_df  = pd.read_csv(SFA_RESULTS, dtype=str)

# --- Step 2: Normalize postal codes ---
centres_df["PostalCode"] = centres_df["PostalCode"].str.zfill(6)
stalls_df["Postal Code"] = stalls_df["Postal Code"].str.zfill(6)

# --- Step 3: Merge ---
merged = stalls_df.merge(
    centres_df[["PostalCode", "Name"]],
    left_on="Postal Code",
    right_on="PostalCode",
    how="left"
)

merged = merged.drop(columns=["PostalCode"])
merged = merged.rename(columns={"Name": "Hawker Centre"})

# --- Step 4: Save merged dataset ---
merged.to_csv(OUTPUT, index=False)
print(f"✅ Saved merged results with hawker centre names to {OUTPUT}")

# --- Step 5: Create directory for per-centre exports ---
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Step 6: Export one Excel per hawker centre ---
for (centre, postal), group in merged.groupby(["Hawker Centre", "Postal Code"]):
    if pd.isna(centre):
        centre = "Unknown"
    # safe filename
    safe_name = "".join(c for c in centre if c.isalnum() or c in (" ", "_", "-")).strip()
    filename = f"{postal}_{safe_name}.xlsx"
    path = os.path.join(OUTPUT_DIR, filename)
    group.to_excel(path, index=False)
    print(f"  -> {path} ({len(group)} stalls)")

print(f"\n📂 All per-centre Excel files saved in {OUTPUT_DIR}/")

# --- Step 7: Example filters you can use programmatically ---
def filter_by_postal(postal: str):
    return merged[merged["Postal Code"] == postal]

def filter_by_centre(name: str):
    return merged[merged["Hawker Centre"].str.contains(name, case=False, na=False)]

# Example usage
print("\n🔎 Filter by postal 048947:")
print(filter_by_postal("048947").head())

print("\n🔎 Filter by 'Market Street':")
print(filter_by_centre("Market Street").head())
