from typing import List

import pandas as pd
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.dto.code import CodeRead


def __generate_export_df_for_code(db: Session, code_id: int) -> pd.DataFrame:
    code = crud_code.read(db=db, id=code_id)
    code_dto = CodeRead.model_validate(code)
    parent_code_id = code_dto.parent_id
    parent_code_name = None
    if parent_code_id is not None:
        parent_code_name = CodeRead.model_validate(code.parent).name

    data = {
        "code_name": [code_dto.name],
        "description": [code_dto.description],
        "color": [code_dto.color],
        "created": [code_dto.created],
        "parent_code_name": [parent_code_name],
    }

    df = pd.DataFrame(data=data)
    return df


def generate_export_dfs_for_all_codes_in_project(
    db: Session, project_id: int
) -> List[pd.DataFrame]:
    codes = crud_project.read(db=db, id=project_id).codes
    exported_codes: List[pd.DataFrame] = []
    for code in codes:
        export_data = __generate_export_df_for_code(db=db, code_id=code.id)
        exported_codes.append(export_data)
    return exported_codes
