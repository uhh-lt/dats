from typing import (
    Dict,
    Optional,
)

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user


def __check_user_missing_values(df: pd.DataFrame) -> None:
    if df["email"].isna().any():
        raise ValueError(f"Missing email on rows: {df[df['email'].isna()]}")


def __check_user_duplicates(df: pd.DataFrame) -> None:
    if df["email"].duplicated().any():
        raise ValueError(
            f"Some emails are duplicated: {df['email'][df['email'].duplicated()].unique()}"
        )


def import_users_to_proj(
    db: Session,
    df: pd.DataFrame,
    proj_id: int,
) -> Dict[str, int]:
    __check_user_missing_values(df)
    __check_user_duplicates(df)

    email_id_mapping: Dict[str, int] = dict()
    for _, row in df.iterrows():
        email: Optional[str] = (
            str(row["email"]) if isinstance(row["email"], str) else None
        )

        if not email:
            continue

        user_orm = crud_user.read_by_email_if_exists(db=db, email=email)
        if user_orm:
            email_id_mapping[email] = user_orm.id
            if user_orm.id != SYSTEM_USER_ID:
                crud_project.associate_user(db=db, proj_id=proj_id, user_id=user_orm.id)

    logger.info(
        f"Associated imported user emails with existing users {email_id_mapping}."
    )
    return email_id_mapping
