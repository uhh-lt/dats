"""Writing the files of an export into its scratch folder (`out_dir`); the
export service moves the result into the project's exports."""

import json
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd
from loguru import logger


def write_df(*, df: pd.DataFrame, out_dir: Path, fn: str) -> Path:
    """Writes the DataFrame as `<fn>.csv`."""
    path = out_dir / f"{fn}.csv"
    logger.info(f"Writing DataFrame to {path.name} !")
    df.to_csv(path, sep=",", index=False, header=True)
    return path


def write_json(
    *, json_obj: list[dict[str, Any]] | dict[str, Any], out_dir: Path, fn: str
) -> Path:
    """Writes the JSON object as `<fn>.json`."""
    path = out_dir / f"{fn}.json"
    logger.info(f"Writing JSON to {path.name} !")
    path.write_text(json.dumps(json_obj, indent=4))
    return path


def write_zip(*, files: list[Path], out_dir: Path, fn: str) -> Path:
    """Writes the files into the archive `<fn>.zip`, each under its name."""
    path = out_dir / f"{fn}.zip"
    logger.info(f"Writing {len(files)} files to {path.name} !")
    with zipfile.ZipFile(path, mode="w") as zipf:
        for file in files:
            zipf.write(file, file.name)
    return path
