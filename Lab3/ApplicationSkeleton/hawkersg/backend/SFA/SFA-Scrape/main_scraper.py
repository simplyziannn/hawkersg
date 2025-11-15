from __future__ import annotations
import os
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

from excel_helpers import load_and_clean_postals, to_excel_tidy
from helpers import input_postal_code, TableSelectors, paginate_and_scrape
import pandas as pd


def make_driver(headless: bool = False):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--start-maximized")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    service = ChromeService(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=opts)

def main():
    load_dotenv()

    target_url   = os.getenv("TARGET_URL")
    csv_path     = os.getenv("CSV_PATH", "hawker_centres.csv")
    postal_sel   = os.getenv("POSTAL_INPUT_SELECTOR")
    submit_sel   = os.getenv("SUBMIT_BUTTON_SELECTOR") or "enter"

    spinner      = os.getenv("SPINNER_SELECTOR", ".spinner.active")
    results_ready= os.getenv("RESULTS_READY_SELECTOR", "table")

    ts = TableSelectors(
        row=os.getenv("ROW_SELECTOR", "tbody tr"),
        col_addr_link=os.getenv("COL_ADDR_LINK_SELECTOR", "td:nth-child(2) a"),
        col_licence_no=os.getenv("COL_LICENCE_NO_SELECTOR", "td:nth-child(3)"),
        col_licensee=os.getenv("COL_LICENSEE_SELECTOR", "td:nth-child(4)"),
        col_business=os.getenv("COL_BUSINESS_SELECTOR", "td:nth-child(5)"),
        col_foodtype=os.getenv("COL_FOODTYPE_SELECTOR", "td:nth-child(6)"),
        next_btn=os.getenv("NEXT_BUTTON_SELECTOR", "//button[contains(@aria-label,'Next')]"),
        next_btn_disabled=os.getenv("NEXT_BUTTON_DISABLED_SELECTOR", None),
        results_ready=results_ready,
        spinner=spinner,
    )

    out_csv = os.getenv("OUT_CSV", "sfa_results.csv")

    if not target_url or not postal_sel:
        raise SystemExit("Please set TARGET_URL and POSTAL_INPUT_SELECTOR in .env")

    df = load_and_clean_postals(csv_path)
    print(f"Loaded {len(df)} unique valid postals from '{csv_path}'.")

    # optional review copy
    try:
        to_excel_tidy(df, os.getenv("EXPORT_XLSX", "cleaned_postals.xlsx"))
    except Exception:
        pass

    driver = make_driver(headless=False)
    all_records = []
    try:
        driver.get(target_url)

        for idx, pcode in enumerate(df["PostalCode_norm"], 1):
            print(f"\n[{idx}/{len(df)}] Searching postal {pcode} …")
            input_postal_code(driver, pcode, field_selector=postal_sel, submit=submit_sel, timeout=15)

            # scrape this postal across ALL pages
            records = paginate_and_scrape(driver, ts, timeout=15, delay_s=0.25)
            for r in records:
                r["Postal Code"] = pcode
            print(f"  -> collected {len(records)} rows")

            # --- Save incrementally after each postal ---
            if records:
                out_df = pd.DataFrame(records)
                cols = [
                    "Postal Code",
                    "Establishment Address",
                    "Address URL",
                    "Licence Number",
                    "Licensee Name",
                    "Business Name",
                    "Type of Food Business",
                ]
                out_df = out_df.reindex(columns=cols)

                # Append to CSV if file exists, else create new
                if os.path.exists(out_csv):
                    out_df.to_csv(out_csv, mode="a", header=False, index=False)
                else:
                    out_df.to_csv(out_csv, index=False)
                print(f"  ✅ Saved {len(out_df)} rows for {pcode} into {out_csv}")
            else:
                print(f"  ⚠️ No results for {pcode}")


    finally:
        pass
        # driver.quit()

    # save cumulative results (append-safe)

    if all_records:
        out_df = pd.DataFrame(all_records)
        # stable column order
        cols = ["Postal Code","Establishment Address","Address URL","Licence Number","Licensee Name","Business Name","Type of Food Business"]
        out_df = out_df.reindex(columns=cols)
        out_df.to_csv(out_csv, index=False)
        print(f"\n✅ Saved {len(out_df)} rows to {out_csv}")
    else:
        print("\n⚠️ No rows collected.")

if __name__ == "__main__":
    main()
