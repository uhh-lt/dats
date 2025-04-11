from pathlib import Path
from typing import List

import pandas as pd
from app.core.data.crud.project import crud_project
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.eximport.user.user_export_schema import (
    UserExportCollection,
    UserExportSchema,
)
from app.core.data.orm.user import UserORM
from app.core.data.repo.repo_service import RepoService
from loguru import logger
from sqlalchemy.orm import Session


def export_all_users(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    users = crud_project.read(db=db, id=project_id).users
    return __export_users(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_users",
        users=users,
    )


def __export_users(
    db: Session,
    repo: RepoService,
    fn: str,
    users: List[UserORM],
) -> Path:
    if len(users) == 0:
        raise NoDataToExportError("No users to export.")

    export_data = __generate_export_df_for_users(users=users)
    return repo.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_users(
    users: List[UserORM],
) -> pd.DataFrame:
    logger.info(f"Exporting {len(users)} users ...")

    user_export_items = []
    for user_data in users:
        user_export_items.append(
            UserExportSchema(
                email=user_data.email,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
            )
        )

    collection = UserExportCollection(users=user_export_items)
    return collection.to_dataframe()
