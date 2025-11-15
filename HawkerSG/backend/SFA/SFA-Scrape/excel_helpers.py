from __future__ import annotations
import re
from pathlib import Path
from typing import Iterable, List, Optional

import pandas as pd


# ---------- DataFrame helpers ----------

def read_csv_as_text(path: str | Path) -> pd.DataFrame:
    """
    Read a CSV with ALL columns as strings to avoid type guessing
    (e.g., preserves leading zeros like 048940).
    Also trims whitespace in headers and cells.
    """
    df = pd.read_csv(path, dtype="string", keep_default_na=False)
    df.columns = [c.strip() for c in df.columns]
    for c in df.columns:
        df[c] = df[c].astype("string").str.strip()
    return df


def ensure_columns(df: pd.DataFrame, required: Iterable[str]) -> None:
    """Raise if any required column is missing."""
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required column(s): {missing}. Present: {list(df.columns)}"
        )


# ---------- Postal cleaning ----------

def normalize_postal_series(series: pd.Series) -> pd.Series:
    """
    Clean a 'PostalCode' Series:
      - remove non-digits
      - pad to 6 digits (repairs dropped leading zeros, e.g. '48940' -> '048940')
      - set invalids to <NA>
    Returns string dtype.
    """
    def norm(x: Optional[str]) -> Optional[str]:
        s = "" if x is None else str(x)
        s = re.sub(r"\D", "", s)
        if len(s) == 5:
            s = "0" + s
        if len(s) != 6:
            return pd.NA
        return s
    return series.map(norm).astype("string")


def drop_blank_rows(df: pd.DataFrame, subset: List[str]) -> pd.DataFrame:
    """Drop rows where any of the given columns are NA/blank."""
    return df.dropna(subset=subset)


def dedupe(df: pd.DataFrame, subset: List[str]) -> pd.DataFrame:
    """Drop duplicates by subset, keep first occurrence."""
    return df.drop_duplicates(subset=subset, keep="first").reset_index(drop=True)


# ---------- Optional: tidy Excel export for manual review ----------

def to_excel_tidy(
    df: pd.DataFrame,
    out_path: str | Path,
    *,
    freeze_header: bool = True,
    width: int = 12,
    sheet_name: str = "data",
) -> None:
    """
    Save DataFrame to XLSX with a frozen header row and uniform column widths.
    Requires 'openpyxl'.
    """
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    with pd.ExcelWriter(out, engine="openpyxl") as xw:
        df.to_excel(xw, index=False, sheet_name=sheet_name)
        ws = xw.book[sheet_name]
        if freeze_header:
            ws.freeze_panes = "A2"
        for col in ws.columns:
            ws.column_dimensions[col[0].column_letter].width = width


# ---------- One-call pipeline for your file ----------

def load_and_clean_postals(csv_path: str | Path) -> pd.DataFrame:
    """
    Pipeline:
      1) Read CSV safely (strings everywhere)
      2) Ensure 'PostalCode' exists
      3) Create 'PostalCode_norm' (cleaned; invalid -> NA)
      4) Drop rows with invalid/blank 'PostalCode_norm'
      5) De-duplicate by 'PostalCode_norm'
    Returns a cleaned DataFrame.
    """
    df = read_csv_as_text(csv_path)
    ensure_columns(df, ["PostalCode"])

    # Make a normalized code column
    df["PostalCode_norm"] = normalize_postal_series(df["PostalCode"])

    # Stats (handy logs)
    total = len(df)
    blanks = df["PostalCode_norm"].isna().sum()

    df = drop_blank_rows(df, ["PostalCode_norm"])
    df = dedupe(df, ["PostalCode_norm"])

    cleaned = len(df)
    # print(f"Rows: {total} total | {blanks} invalid/blank postals removed | {cleaned} unique kept")

    return df
