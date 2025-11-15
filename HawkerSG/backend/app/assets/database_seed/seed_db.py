import os
import sys
import json
from sqlalchemy.orm import Session
import pandas as pd
from sqlalchemy import select
from app.controllers.business_controller import get_password_hash

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

DEFAULT_BUSINESS_PHOTO = "default-placeholder.jpg"


BUSINESS_PHOTO_MAP = {
    "Lao Fu Jia Tonic Soup": "laofujiatonicsoup.jpg",
    "JIAO CAI BBQ": "jiaocaibbq.webp",
    "Tuckshop": "tuckshop.webp",
    "AH TAN WINGS": "ahtanwings.webp",
    "one mouth noodle": "onemouthnoodle.webp",
    "SMOKIN' JOE": "SMOKIN' JOE.jpg",
    "BISMIBIRYANI" : "BISMIBIRYANI.jpg",
    "summer dessert" : "summer dessert.webp",
    "PADANG EXPRESS INDO DELIGHT" : "PADANG EXPRESS INDO DELIGHT.jpg",
    "Grandpa's Kitchen Mala Xiang Guo" : "Grandpa's Kitchen Mala Xiang Guo.jpeg",
    "A Taste of Korean" : "A Taste of Korean.webp",
    "TZE CHAR" : "TZE CHAR.jpeg",
    "Salad & Cream" : "Salad & Cream.jpeg",
    "Bukit Canberra Hawker Centre" : "Bukit Canberra Hawker Centre.jpg",
    "Senja Hawker Centre" : "Senja Hawker Centre.jpg-",
    "Buangkok Hawker Centre" : "buangkok-hawker-centre-view.jpg",
    "Telok Blangah Hawker Centre & Market" : "Telok Blangah Hawker Centre & Market.jpeg",
    "Market Street Hawker Centre" : "marketst.jpeg",
    "Margaret Drive Hawker Centre" : "Margaret Drive Hawker Centre.jpg",
    "Fernvale Hawker Centre & Market" : "Fernvale Hawker Centre & Market.jpg",
    "Phawo Thai Food" : "phawo thai food.jpg",
    "LOCK'S TOFU SHOP" : "locks_tofu.jpg",
    "838 Beef Noodles" : "838_beef_noodles.jpeg",
    "XIN LONG XING" : "xlx.jpg",
    "BAN MIAN" : "banmian.jpg",
    "DOUBLE J" : "",
    "munchi" : "munchi.webp",
    "CONGEE" : "CONGEE.jpeg",
    "Da San Yuan" : "Da San Yuan.jpg",
    "HENG HENG BBQ CHICKEN WINGS & SATAY" : "HENG HENG BBQ CHICKEN WINGS & SATAY.webp",
    "Ming Su Vegetarian" : "Ming Su Vegetarian.webp",
    "WEE KIM HAINESE CHICKEN RICE" : "WEE KIM HAINESE CHICKEN RICE.webp",
    "Shastris Kitchenette" : "Shastris Kitchenette.jpeg",
    "LIVE SEAFOOD" : "LIVE SEAFOOD.jpg",
    "Yew's Noodle" : "Yew's Noodle.jpeg",
    "kedai kak nur & meera" : "kedai kak nur & meera.jpg",
    "308 Yong Tau Foo" : "308 Yong Tau Foo.jpeg",
    "Mingfa Fishball Noodles" : "Mingfa Fishball Noodles.png",
    "Dollah Chicken Stall" : "Dollah Chicken Stall.jpg",
    "Zham Zham Food" : "Zham Zham Food.jpg",
    "Grandma Mee Sua" : "Grandma Mee Sua.jpg",
    "Yong Ji" : "Yong Ji.jpg",
    "AH KEE BEEF NOODLE" : "AH KEE BEEF NOODLE.jpg",
    "Kian Meng Kway Chap. Pig's Organ Soup" : "Kian Meng Kway Chap. Pig's Organ Soup.jpeg",
    "Hong Kee Porridge" : "Hong Kee Porridge.jpg",
    "Jian Kang Noodles" : "Jian Kang Noodles.jpeg",
    "Queenstown Popiah Skin" : "Queenstown Popiah Skin.jpeg",
    "Chai Chee Pork Porridge" : "Chai Chee Pork Porridge.jpg",
    "75 ah balling peanut soup" : "75 ah balling peanut soup.jpg",
    "Swatow Wanton Noodle" : "Swatow Wanton Noodle.jpg",
    "Hai Heng Economic Bee Hoon" : "Hai Heng Economic Bee Hoon.jpg",
    "Wan Zai Porridge" : "Wan Zai Porridge.jpeg",
    "Ah Black Chicken" : "Ah Black Chicken.jpg",
    "Guo Tiao Di Mushroom Minced Meat Noodle" : "Guo Tiao Di Mushroom Minced Meat Noodle.png",
    "Seng Hiang Bak Chor Mee" : "Seng Hiang Bak Chor Mee.jpeg",
}

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

                    cuisine_type="Others",
                    description="",
                    photo="",
                    status=StallStatus.OPEN

                    # Can consider adding a new field such that only the real owner of the business claim the hawker stall when signing up
                    # All stalls in every hawker centre are preloaded but can't be edited till it is claimed
                    # is_claimed = false
                )

                filename = BUSINESS_PHOTO_MAP.get(new_business_stall.stall_name)
                if filename:
                    new_business_stall.photo = f"http://localhost:8001/static/business/{filename}"
                else:
                    new_business_stall.photo = f"http://localhost:8001/static/business/{DEFAULT_BUSINESS_PHOTO}"

                db.add(new_business_stall)
        # # seed test business account
        # new_business_stall = Business(
        #     email="business@test.com",
        #     hashed_password=get_password_hash("12345"),
        #     user_type="business",
        #     username="",
            
        #     license_number="Y510131002",
        #     stall_name="Phawo Thai Food",
        #     licensee_name="CHUA CHEE KIAN (CAI ZHIJIAN)",
        #     establishment_address="51 YISHUN AVENUE 11 #01-31,Yishun park hawker centre,Singapore 768867",
        #     postal_code="768867",
        #     hawker_centre="Yishun Park Hawker Centre",

        #     cuisine_type="Thai",
        #     description="",
        #     photo="http://localhost:8001/static/business/phawo thai food.jpg",
        #     status=StallStatus.OPEN
        # )
        # db.add(new_business_stall)
        
        # Commit all changes to the database
        db.commit()
        print("SFA data seeding complete.")
        
    except Exception as e:
        db.rollback()
        print(f"An unexpected error occurred during seeding: {e}")
        raise # Re-raise the exception to be handled by the caller (main.py)
