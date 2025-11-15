import requests
import json
import time

# ==============================================================================
# CONFIGURATION
# ⚠️ REPLACE THIS WITH YOUR VALID ONEMAP JWT ACCESS TOKEN
# This token typically expires after 24 hours and needs to be refreshed.
# ==============================================================================
ONEMAP_ACCESS_TOKEN = "YOUR_ONEMAP_ACCESS_TOKEN"

# Base URL for the OneMap Search API for geocoding
ONEMAP_SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search"

# File paths
INPUT_FILE = "backend/SFA/index.json"
OUTPUT_FILE = "backend/SFA/index_enriched.json"


def get_coordinates(postal_code: str) -> tuple[float | None, float | None]:
    """
    Fetches latitude and longitude for a given postal code using OneMap Search API.
    """
    if ONEMAP_ACCESS_TOKEN == "YOUR_ONEMAP_ACCESS_TOKEN":
        print("ERROR: Please update ONEMAP_ACCESS_TOKEN with your actual key.")
        return None, None

    # Define the query parameters
    params = {
        "searchVal": postal_code,
        "returnGeom": "Y",  # Request coordinates (Geometry)
        "getAddrDetails": "N",
        "pageNum": 1
    }
    
    # Define the required Authorization header
    headers = {
        "Authorization": ONEMAP_ACCESS_TOKEN
    }

    print(f"Searching coordinates for postal: {postal_code}...", end=" ")

    try:
        response = requests.get(ONEMAP_SEARCH_URL, params=params, headers=headers)
        response.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)
        data = response.json()

        if data.get("found") and data["found"] > 0 and data["results"]:
            result = data["results"][0]
            lat = float(result.get("LATITUDE"))
            lon = float(result.get("LONGITUDE"))
            print("FOUND")
            return lat, lon
        else:
            print("NOT FOUND")
            return None, None
            
    except requests.exceptions.HTTPError as errh:
        print(f"\nHTTP Error for {postal_code}: {errh}")
    except requests.exceptions.ConnectionError as errc:
        print(f"\nConnection Error for {postal_code}: {errc}")
    except requests.exceptions.Timeout as errt:
        print(f"\nTimeout Error for {postal_code}: {errt}")
    except requests.exceptions.RequestException as err:
        print(f"\nAn unexpected Error occurred: {err}")
    except ValueError:
        print("\nError: Could not parse LATITUDE/LONGITUDE as float.")

    return None, None


def main():
    """
    Main function to orchestrate the loading, geocoding, and saving process.
    """
    print(f"Loading data from {INPUT_FILE}...")
    
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            hawker_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file '{INPUT_FILE}' not found. Please create it.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{INPUT_FILE}'. Check file structure.")
        return

    print(f"Successfully loaded {len(hawker_data)} hawker centres.")
    
    enriched_data = []

    # Iterate through each hawker centre entry
    for item in hawker_data:
        postal_code = item.get("postal")
        
        if postal_code:
            lat, lon = get_coordinates(postal_code)
            
            # Add coordinates to the item
            item["latitude"] = lat
            item["longitude"] = lon
        else:
            print(f"Skipping item: {item.get('hawker_centre')} - Missing postal code.")
            item["latitude"] = None
            item["longitude"] = None
            
        enriched_data.append(item)
        
        # ⚠️ API courtesy: Introduce a small delay to avoid hitting rate limits.
        time.sleep(0.2) 

    # Save the enriched data to the new JSON file
    print(f"\nSaving {len(enriched_data)} items to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        # Use indent=2 for pretty printing the JSON output
        json.dump(enriched_data, f, indent=2)

    print(f"Process complete. Data saved successfully to {OUTPUT_FILE}.")


if __name__ == "__main__":
    main()
