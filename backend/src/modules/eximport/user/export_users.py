from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from core.user.user_orm import UserORM
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.user.user_export_schema import (
    UserExportCollection,
    UserExportSchema,
)
from repos.filesystem_repo import FilesystemRepo


def export_all_users(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    users = crud_project.read(db=db, id=project_id).users
    return __export_users(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_users",
        users=users,
    )


def __export_users(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    users: list[UserORM],
) -> Path:
    if len(users) == 0:
        raise NoDataToExportError("No users to export.")

    export_data = __generate_export_df_for_users(users=users)
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_users(
    users: list[UserORM],
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
