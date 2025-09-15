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
from repos.filesystem_repo import FilesystemRepo


def export_all_codes(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    codes = crud_project.read(db=db, id=project_id).codes
    return __export_codes(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_codes",
        codes=codes,
    )


def __export_codes(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    codes: list[CodeORM],
) -> Path:
    if len(codes) == 0:
        raise NoDataToExportError("No codes to export.")

    export_data = __generate_export_df_for_codes(codes=codes)
    return fsr.write_df_to_temp_file(
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
