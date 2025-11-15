from __future__ import annotations
from typing import Tuple, Optional, Union
from dataclasses import dataclass
from time import sleep

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    StaleElementReferenceException,
    TimeoutException,
)

Locator = Tuple[str, str]

# -------------------- Locator + input helpers --------------------

def get_locator(selector: str) -> Locator:
    """
    Accept either CSS or XPath and return a Selenium (By, value) tuple.
    - XPath if it starts with '/' or '//'
    - Otherwise treat as CSS
    """
    sel = selector.strip()
    if sel.startswith("/") or sel.startswith("//"):
        return (By.XPATH, sel)
    return (By.CSS_SELECTOR, sel)

def robust_clear(el) -> None:
    """Clear an input reliably."""
    try:
        el.clear()
    except Exception:
        el.send_keys(Keys.CONTROL, "a")
        el.send_keys(Keys.DELETE)

def input_postal_code(
    driver: WebDriver,
    postal_code: Union[str, int],
    field_selector: str,
    submit: Optional[Union[str, Locator, str]] = None,
    timeout: int = 12,
    overlay_selector: Optional[str] = ".spinner.active",
) -> str:
    """Type a (pre-cleaned) postal code and optionally submit."""
    code = str(postal_code).strip()
    wait = WebDriverWait(driver, timeout)
    field_loc = get_locator(field_selector)

    # Wait for overlay to disappear 
    if overlay_selector:
        try:
            wait.until(EC.invisibility_of_element_located(get_locator(overlay_selector)))
        except TimeoutException:
            pass

    wait.until(EC.presence_of_element_located(field_loc))
    wait.until(EC.element_to_be_clickable(field_loc))
    field = driver.find_element(*field_loc)

    # Try normal click; if intercepted, scroll + JS click
    try:
        field.click()
    except ElementClickInterceptedException:
        if overlay_selector:
            try:
                wait.until(EC.invisibility_of_element_located(get_locator(overlay_selector)))
            except TimeoutException:
                pass
        try:
            driver.execute_script(
                "arguments[0].scrollIntoView({block:'center', inline:'nearest'});", field
            )
            driver.execute_script("arguments[0].click();", field)
        except Exception:
            field = wait.until(EC.element_to_be_clickable(field_loc))
            driver.execute_script("arguments[0].click();", field)

    robust_clear(field)
    field.send_keys(code)

    if submit is None:
        return code
    if isinstance(submit, str):
        if submit.lower() == "enter":
            field.send_keys(Keys.ENTER)
            return code
        btn = wait.until(EC.element_to_be_clickable(get_locator(submit)))
        btn.click()
        return code
    btn = wait.until(EC.element_to_be_clickable(submit))
    btn.click()
    return code

# -------------------- Table scraping & pagination --------------------

@dataclass
class TableSelectors:
    row: str                           # selector for table rows (skip header)
    col_addr_link: str                 # inside row: the <a> in address cell
    col_licence_no: str
    col_licensee: str
    col_business: str
    col_foodtype: str
    next_btn: str                      # pagination "Next"
    next_btn_disabled: Optional[str] = None
    results_ready: Optional[str] = None
    spinner: Optional[str] = None

def _wait_invisible(driver, selector: str, timeout: int = 12):
    WebDriverWait(driver, timeout).until(
        EC.invisibility_of_element_located(get_locator(selector))
    )

def _wait_visible(driver, selector: str, timeout: int = 12):
    WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located(get_locator(selector))
    )

def scrape_results_page(driver, ts: TableSelectors, timeout: int = 12) -> list[dict]:
    """Scrape one page of the results table into a list of dicts."""
    # spinner off + table visible
    if ts.spinner:
        try: _wait_invisible(driver, ts.spinner, timeout)
        except TimeoutException: pass
    if ts.results_ready:
        try: _wait_visible(driver, ts.results_ready, timeout)
        except TimeoutException:
            return []

    rows = driver.find_elements(*get_locator(ts.row))
    out: list[dict] = []
    for r in rows:
        try:
            addr_el = r.find_element(*get_locator(ts.col_addr_link))
            out.append({
                "Establishment Address": addr_el.text.strip(),
                "Address URL": addr_el.get_attribute("href"),
                "Licence Number": r.find_element(*get_locator(ts.col_licence_no)).text.strip(),
                "Licensee Name":  r.find_element(*get_locator(ts.col_licensee)).text.strip(),
                "Business Name":  r.find_element(*get_locator(ts.col_business)).text.strip(),
                "Type of Food Business": r.find_element(*get_locator(ts.col_foodtype)).text.strip(),
            })
        except Exception:
            continue
    return out

def _first_row_key(driver, ts: TableSelectors) -> str:
    """Key from the first row (href/text) to detect page changes."""
    try:
        rows = driver.find_elements(*get_locator(ts.row))
        if not rows:
            return ""
        a = rows[0].find_element(*get_locator(ts.col_addr_link))
        return a.get_attribute("href") or a.text
    except Exception:
        return ""

def _can_go_next(driver, ts: TableSelectors) -> bool:
    """Return True if 'Next' exists and is not disabled."""
    try:
        btn = driver.find_element(*get_locator(ts.next_btn))
    except Exception:
        return False
    try:
        cls = (btn.get_attribute("class") or "").lower()
        if "disabled" in cls:
            return False
        if ts.next_btn_disabled and driver.find_elements(*get_locator(ts.next_btn_disabled)):
            return False
        return btn.is_displayed() and btn.is_enabled()
    except StaleElementReferenceException:
        return False

def paginate_and_scrape(driver, ts: TableSelectors, timeout: int = 12, delay_s: float = 0.2) -> list[dict]:
    """
    Scrape the current page and all following pages by clicking 'Next'
    until it becomes disabled or disappears. Uses first-row key to
    confirm page changed after clicking.
    """
    all_rows: list[dict] = []
    while True:
        all_rows.extend(scrape_results_page(driver, ts, timeout=timeout))

        if not _can_go_next(driver, ts):
            break

        prev_key = _first_row_key(driver, ts)
        btn = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable(get_locator(ts.next_btn))
        )
        btn.click()

        #  spinner wait
        if ts.spinner:
            try: _wait_invisible(driver, ts.spinner, timeout)
            except TimeoutException: pass

        # wait until the table redraws (first-row key changes)
        try:
            WebDriverWait(driver, timeout).until(lambda d: _first_row_key(d, ts) != prev_key)
        except TimeoutException:
            sleep(delay_s)

    return all_rows
