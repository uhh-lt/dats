from typing import Dict, List

import pandas as pd
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import crud_user
from app.core.data.eximport.user.user_export_schema import (
    UserExportCollection,
)
from app.core.data.orm.user import UserORM
from loguru import logger
from sqlalchemy.orm import Session


class ImportUsersError(Exception):
    def __init__(self, errors: List[str]) -> None:
        super().__init__(f"Errors occurred while importing users: {errors}")


def import_users_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> List[int]:
    """
    Import users from a DataFrame into a project.
    Validates input data and links existing users to the project.

    Args:
        db: Database session
        df: DataFrame with user data
        project_id: ID of the project to import users into

    Returns:
        List of imported user IDs

    Raises:
        ImportUsersError: If validation fails
    """
    # Validate input data using our schema
    try:
        user_collection = UserExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load user import data: {e}")
        raise ImportUsersError(errors=[f"Invalid data format for users: {e}"])

    logger.info(f"Importing {len(user_collection.users)} users...")

    error_messages = []

    # Check if the Users exists
    user_dict: Dict[str, UserORM] = {}
    for user_schema in user_collection.users:
        user = crud_user.read_by_email(db=db, email=user_schema.email)
        if user is None:
            error_messages.append(f"User'{user_schema.email}' not found in the system.")
        else:
            user_dict[user_schema.email] = user

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing users:\n"
            + "\n".join(error_messages)
        )
        raise ImportUsersError(errors=error_messages)

    # Everything is fine, we can link the users to the project
    project_user_emails = {
        user.email for user in crud_project.read(db=db, id=project_id).users
    }
    imported_user_ids: List[int] = []
    for user_email, user in user_dict.items():
        # Check if the user is already associated with the project
        if user.email in project_user_emails:
            logger.info(
                f"User '{user.email}' is already part of the project {project_id}. Skipping..."
            )
            continue
        # Associate the user with the project
        imported_user = crud_project.associate_user(
            db=db, proj_id=project_id, user_id=user.id
        )
        imported_user_ids.append(imported_user.id)

    logger.info(
        f"Successfully linked {len(imported_user_ids)} users to project {project_id}."
    )
    return imported_user_ids
