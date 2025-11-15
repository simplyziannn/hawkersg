import os
import sys
import json
from sqlalchemy.orm import Session
import pandas as pd
from sqlalchemy import select

# ----------------------------------------------------
# Pathing to allow model imports
# ----------------------------------------------------

# Get the path to the directory containing this script (database_seed)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Add the project root (backend) to sys.path for internal imports to work
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..', '..', '..')
sys.path.append(PROJECT_ROOT) 

# Import necessary models
from app.models.hawker_centre_model import HawkerCentre
from app.models.business_model import Business, StallStatus
from app.models.operating_hour_model import OperatingHour
from app.models.menu_item_model import MenuItem

def format_address(row):
    """
    Formats the address components into the Singapore address standard 
    (e.g., Blk 123, Street Name, Building Name S(123456)).
    """
    parts = []
    
    # Use pd.notna() to safely check for missing data
    
    # 1. Block/House Number
    if pd.notna(row.get('Block')):
        parts.append(f"Blk {row['Block']}")
        
    # 2. Street Name
    if pd.notna(row.get('Street')):
        parts.append(row['Street'])
        
    # 3. Building/Estate Name
    if pd.notna(row.get('Building')):
        parts.append(row['Building'])
    
    address = ", ".join(parts).strip()
    
    # 4. Postal Code (S(xxxxxx) format for structured data)
    postal_code = row.get('PostalCode')
    if pd.notna(postal_code):
        # Use int() to convert potential float
        pc_str = str(int(postal_code))
        if address:
            address += f" S({pc_str})"
        else:
            address = f"S({pc_str})" 

    return address if address else "N/A"

def seed_sfa_data_if_empty(db: Session, index_file_path: str):
    """
    Checks if the HawkerCentre table is empty. If so, seeds SFA data
    from hawker_centres.csv first, then processes individual stall files.
    """
    
    # 1. Check if the database has already been seeded (using the session's state)
    # Using db.scalars().first() is the correct way to execute a select statement for a single result.
    if db.scalars(select(HawkerCentre).limit(1)).first():
        print("Database already contains Hawker Centres. Skipping seeding.")
        return

    print("Database is empty. Starting SFA data seeding...")
    SFA_DIR = os.path.dirname(index_file_path)
    
    HAWKER_CENTRES_CSV_PATH = os.path.join(SFA_DIR, 'SFA-Scrape', 'hawker_centres.csv')
    
    # Use manual db.commit() and db.rollback()
    try:
        # --- PHASE 1: SEED HAWKER CENTRE DATA ---
        print("\n--- Phase 1: Seeding Hawker Centre Master Data ---")
        try:
            hawker_df = pd.read_csv(HAWKER_CENTRES_CSV_PATH)
        except FileNotFoundError:
            print(f"FATAL ERROR: Hawker Centres CSV file not found at {HAWKER_CENTRES_CSV_PATH}. Aborting seeding.")
            return

        for _, row in hawker_df.iterrows():
            hawker_centre_name = row.get('Name')
            if not hawker_centre_name: continue
            
            # Find or Create HawkerCentre record
            hawker_centre = db.scalar(
                select(HawkerCentre).where(HawkerCentre.name == hawker_centre_name)
            )
            
            if not hawker_centre:
                full_address = format_address(row)
                
                hawker_centre = HawkerCentre(
                    name=hawker_centre_name,
                    address=full_address,
                    description=row.get('Description', ''),
                    image=row.get('PhotoURL', ''),
                    latitude=row.get('Latitude'),
                    longitude=row.get('Longitude'),
                    rating=0.0 # Initialize rating
                )
                db.add(hawker_centre)
                print(f"  Added Hawker Centre: {hawker_centre_name}")

        # Commit Phase 1 data before starting Phase 2, in case of interruption
        db.flush() 
        db.commit()


        # --- PHASE 2: SEED BUSINESS (STALL) DATA ---
        print("\n--- Phase 2: Seeding Individual Business Stall Data ---")
        print(f"Attempting to load index file from: {index_file_path}")

        try:
            with open(index_file_path, 'r') as f:
                index_data = json.load(f)
        except FileNotFoundError:
            print(f"FATAL ERROR: Index file not found at {index_file_path}. Aborting seeding.")
            return
        except Exception as e:
            print(f"FATAL ERROR: Failed to read or parse index.json: {e}. Aborting seeding.")
            return

        for entry in index_data:
            hawker_centre_name = entry.get('hawker_centre')
            file_path_relative_to_SFA = entry.get('file')
            
            if not hawker_centre_name or not file_path_relative_to_SFA:
                print(f"Skipping malformed entry in index: {entry}")
                continue
                
            print(f"  Processing Business Stalls for: {hawker_centre_name}")

            excel_file_path = os.path.join(SFA_DIR, file_path_relative_to_SFA)
            
            try:
                df = pd.read_excel(excel_file_path)
            except FileNotFoundError:
                print(f"  Skipping: Excel file not found at {excel_file_path}")
                continue
            except Exception as e:
                print(f"  Skipping: Error reading Excel file {excel_file_path}: {e}")
                continue
                
            # Retrieve the HawkerCentre object created in Phase 1
            hawker_centre_obj = db.scalar(
                select(HawkerCentre).where(HawkerCentre.name == hawker_centre_name)
            )
            
            # if not hawker_centre_obj:
            #     print(f"  FATAL: Hawker Centre '{hawker_centre_name}' not found from CSV data. Skipping stalls.")
            #     continue

            # Seed Business (Stall) records
            for _, row in df.iterrows():
                license_no = str(row.get('Licence Number', row.get('license_number', row.get('License_No', '')))).strip() 
                if not license_no: continue

                existing_business = db.scalar(
                    select(Business).where(Business.license_number == license_no)
                )
                if existing_business:
                    continue
                
                new_business_stall = Business(
                    email=f"sfa_placeholder_{license_no}@example.com",
                    hashed_password="placeholder",
                    user_type="business",
                    username="",
                    
                    license_number=license_no,
                    stall_name=row.get('Business Name', row.get('Stall_Name', row.get('stall_name'))),
                    licensee_name=row.get('Licensee Name', row.get('Licensee_Name', row.get('licensee_name'))),
                    establishment_address=row.get('Establishment Address', row.get('Establishment_Address', row.get('establishment_address'))),
                    postal_code=row.get('Postal Code', row.get('Postal_Code', row.get('postal_code'))),
                    hawker_centre=hawker_centre_name,

                    description="",
                    photo="",
                    status=StallStatus.OPEN

                    # Can consider adding a new field such that only the real owner of the business claim the hawker stall when signing up
                    # All stalls in every hawker centre are preloaded but can't be edited till it is claimed
                    # is_claimed = false
                )
                db.add(new_business_stall)

        # Commit all changes to the database
        db.commit()
        print("SFA data seeding complete.")
        
    except Exception as e:
        db.rollback()
        print(f"An unexpected error occurred during seeding: {e}")
        raise # Re-raise the exception to be handled by the caller (main.py)
