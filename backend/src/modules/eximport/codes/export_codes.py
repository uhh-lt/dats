from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.code.code_orm import CodeORM
from core.project.project_crud import crud_project
from modules.eximport.codes.code_export_schema import (
    CodeExportCollection,
    CodeExportSchema,
)
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.export_utils import write_df


def export_all_codes(
    db: Session,
    out_dir: Path,
    project_id: int,
) -> Path:
    codes = crud_project.read(db=db, id=project_id).codes
    return __export_codes(
        db=db,
        out_dir=out_dir,
        fn=f"project_{project_id}_all_codes",
        codes=codes,
    )


def __export_codes(
    db: Session,
    out_dir: Path,
    fn: str,
    codes: list[CodeORM],
) -> Path:
    if len(codes) == 0:
        raise NoDataToExportError("No codes to export.")

    export_data = __generate_export_df_for_codes(codes=codes)
    return write_df(
        out_dir=out_dir,
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_codes(codes: list[CodeORM]) -> pd.DataFrame:
    logger.info(f"Exporting {len(codes)} Codes ...")

    code_export_items = []

    for code in codes:
        code_export_items.append(
            CodeExportSchema(
                code_name=code.name,
                color=code.color,
                parent_code_name=code.parent.name if code.parent else None,
                description=code.description or "",
            )
        )

    collection = CodeExportCollection(codes=code_export_items)
    return collection.to_dataframe()
