import json, pandas as pd

with open("index.json", encoding="utf-8") as f:
    INDEX = json.load(f)

def find_entries(query: str):
    q = query.strip().lower()
    return [
        e for e in INDEX
        if q == e["postal"].lower() or q in e["hawker_centre"].lower()
    ]

def load_stalls(file_path: str):
    if file_path.lower().endswith(".xlsx"):
        return pd.read_excel(file_path, dtype=str).fillna("").to_dict("records")
    return pd.read_csv(file_path, dtype=str).fillna("").to_dict("records")

def get_stalls_from_entry(entry):
    return load_stalls(entry["file"])

def print_matches(matches):
    print("⚠️ Multiple matches found:")
    for i, m in enumerate(matches, 1):
        print(f"{i}. {m['hawker_centre']} ({m['postal']})")

def choose_match_interactively(matches):
    """
    Let the user choose one of the matches by index, or refine the search.
    Returns the chosen entry dict or None if user quits.
    """
    while True:
        print_matches(matches)
        choice = input("\nSelect a number, or type a new search, or 'q' to quit: ").strip()

        # allow quitting
        if choice.lower() in ("q", "quit", "exit"):
            return None

        # if numeric and valid -> pick that item
        if choice.isdigit():
            idx = int(choice)
            if 1 <= idx <= len(matches):
                return matches[idx - 1]
            else:
                print(f"❌ Please enter a number between 1 and {len(matches)}.")
                continue

        # otherwise treat as a new search string
        new_matches = find_entries(choice)
        if not new_matches:
            print("❌ No matches for that input. Try again.")
            continue
        if len(new_matches) == 1:
            return new_matches[0]
        # still multiple — loop again with the narrower set
        matches = new_matches

def preview_stalls(stalls, limit=10):
    print(f"✅ Found {len(stalls)} stalls")
    for stall in stalls[:limit]:
        name = stall.get("Business Name") or stall.get("Licensee Name") or "(Unnamed stall)"
        print("-", name)


def run_query_pipeline(query: str, limit: int = 10):
    """
    Pipeline function: given a postal code or hawker centre name,
    returns the entry + stalls and prints a preview.
    """
    matches = find_entries(query)

    if not matches:
        print("⚠️ No matches found.")
        return None, []

    if len(matches) > 1:
        entry = choose_match_interactively(matches)
        if entry is None:
            print("👋 Bye.")
            return None, []
        stalls = get_stalls_from_entry(entry)
        print(f"\n📍 {entry['hawker_centre']} ({entry['postal']})")
        preview_stalls(stalls, limit=limit)
        return entry, stalls

    # exactly one match
    entry = matches[0]
    stalls = get_stalls_from_entry(entry)
    print(f"📍 {entry['hawker_centre']} ({entry['postal']})")
    preview_stalls(stalls, limit=limit)
    return entry, stalls

# for cli
def main():
    query = input("Enter postal code or hawker centre name: ").strip()
    run_query_pipeline(query, limit=10)


if __name__ == "__main__":
    main()
