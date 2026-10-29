from pathlib import Path

import pandas as pd


def read_import_csv(path: Path | str) -> pd.DataFrame:
    """
    Read an export/import CSV file. Only empty cells are missing values (NaN):
    cells like "NA", "N/A", "null" or "nan" are kept as strings, so that e.g. a code
    or user named like a missing value survives an export/import round trip.

    Args:
        path: The CSV file.

    Returns:
        The rows of the file.
    """
    return pd.read_csv(path, keep_default_na=False, na_values=[""])
