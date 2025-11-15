# Query Directory

This script (`query_directory.py`) lets you quickly **search hawker centre stall data** by either:
- **Postal code**, or
- **Hawker centre name**.

It uses the `index.json` (built by `build_index.py`) to locate the correct CSV/XLSX file of stalls.

---

## How to Run
From the `backend` folder:
```bash
python query_directory.py
```
You'll be prompted: 
Enter postal code or hawker centre name:

If there is one match → it will show how many stalls were found, plus the first 10 as a preview.

If there are multiple matches (e.g. typing "Jurong") → it will ask you to choose which hawker centre.

If there are no matches → it will tell you nothing was found.


Enter postal code or hawker centre name: jurong

⚠️ Multiple matches found:
1. Jurong West 505 (640505)
2. Jurong East 347 (600347)

Select a number: 1
✅ Found 42 stalls in Jurong West 505 (640505)
- Ah Hock Chicken Rice
- ...

## Programmatic Use (import the pipeline)

You can call the search flow from other scripts by importing `run_query_pipeline`:

```python
# example: backend/SFA/use_query.py
from query_directory import run_query_pipeline

# 1) Query by centre name (or postal code)
entry, stalls = run_query_pipeline("jurong", limit=10)

if entry is None:
    print("No match or user quit.")
else:
    print(f"Chosen centre: {entry['hawker_centre']} ({entry['postal']})")
    print(f"Total stalls loaded: {len(stalls)}")
    # stalls is a list[dict], e.g. stalls[0]["Business Name"], stalls[0]["Licensee Name"], etc.
    # do whatever you need with the data here
```

Notes

run_query_pipeline(query, limit=10) performs the same logic as the CLI:

If multiple matches, it will prompt you to choose (interactive).

Returns a tuple (entry, stalls) where:

entry is the selected { "postal", "hawker_centre", "file" } dict (or None if no match / quit).

stalls is a list[dict] loaded from the CSV/XLSX file.

Make sure index.json is present and points to your scraped files (e.g., centres_output/...).

