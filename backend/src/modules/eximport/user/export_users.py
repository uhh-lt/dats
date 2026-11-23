from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.export_utils import write_df
from modules.eximport.user.user_export_schema import (
    UserExportCollection,
    UserExportSchema,
)


def export_all_users(
    db: Session,
    out_dir: Path,
    project_id: int,
) -> Path:
    # the members and the virtual users of the project
    users = crud_user.read_by_project(db=db, project_id=project_id)
    return __export_users(
        db=db,
        out_dir=out_dir,
        fn=f"project_{project_id}_all_users",
        users=users,
    )


def __export_users(
    db: Session,
    out_dir: Path,
    fn: str,
    users: list[UserORM],
) -> Path:
    if len(users) == 0:
        raise NoDataToExportError("No users to export.")

    export_data = __generate_export_df_for_users(users=users)
    return write_df(
        out_dir=out_dir,
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
                is_virtual=user_data.is_virtual,
            )
        )

    collection = UserExportCollection(users=user_export_items)
    return collection.to_dataframe()
