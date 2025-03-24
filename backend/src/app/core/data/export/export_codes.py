from pathlib import Path
from typing import List

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.export.no_data_export_error import NoDataToExportError
from app.core.data.orm.code import CodeORM
from app.core.data.repo.repo_service import RepoService


def export_all_codes(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    codes = crud_project.read(db=db, id=project_id).codes
    return __export_codes(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_codes",
        codes=codes,
    )


def __export_codes(
    db: Session,
    repo: RepoService,
    fn: str,
    codes: List[CodeORM],
) -> Path:
    if len(codes) == 0:
        raise NoDataToExportError("No codes to export.")

    export_data = __generate_export_df_for_codes(codes=codes)
    return repo.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_codes(codes: List[CodeORM]) -> pd.DataFrame:
    logger.info(f"Exporting {len(codes)} Codes ...")

    # fill the DataFrame
    data = {
        "code_name": [],
        "description": [],
        "color": [],
        "created": [],
        "parent_code_name": [],
    }

    for code in codes:
        parent_code_name = None
        if code.parent_id is not None:
            parent_code_name = code.parent.name

        data["code_name"].append(code.name)
        data["description"].append(code.description)
        data["color"].append(code.color)
        data["created"].append(code.created)
        data["parent_code_name"].append(parent_code_name)

    return pd.DataFrame(data=data)
