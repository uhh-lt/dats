from typing import Dict, List, Set

import pandas as pd
from app.core.data.crud.project import crud_project
from app.core.data.crud.whiteboard import crud_whiteboard
from app.core.data.dto.whiteboard import WhiteboardCreateIntern
from app.core.data.eximport.whiteboards.whiteboard_export_schema import (
    WhiteboardExportCollection,
    WhiteboardExportSchema,
)
from loguru import logger
from sqlalchemy.orm import Session


class ImportWhiteboardsError(Exception):
    def __init__(self, errors: List[str]) -> None:
        super().__init__(f"Errors occurred while importing whiteboards: {errors}")


def import_whiteboards_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> List[int]:
    """
    Import whiteboards from a DataFrame into a project.

    Args:
        db: Database session
        df: DataFrame with whiteboard data
        project_id: ID of the project to import whiteboards into

    Returns:
        Dictionary mapping original whiteboard IDs to their new IDs in the database

    Raises:
        ImportWhiteboardsError: If validation fails or any required references are missing
    """
    # Validate input data using our schema
    try:
        whiteboard_collection = WhiteboardExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load whiteboard import data: {e}")
        raise ImportWhiteboardsError(errors=["Invalid data format for whiteboards."])

    logger.info(f"Importing {len(whiteboard_collection.whiteboards)} whiteboards...")

    # Whiteboards need a User. We need to check if all users exist in the database
    user_emails: Set[str] = set()
    user_email_to_whiteboards: Dict[str, List[WhiteboardExportSchema]] = {}

    for whiteboard in whiteboard_collection.whiteboards:
        user_emails.add(whiteboard.user_email)
        user_email_to_whiteboards.setdefault(whiteboard.user_email, []).append(
            whiteboard
        )

    # 0. Get the project
    error_messages = []
    project = crud_project.read(db=db, id=project_id)

    # 1. Check if the Users exist and are part of the project
    project_user_emails = {user.email: user for user in project.users}
    for user_email in user_emails:
        if user_email not in project_user_emails:
            error_messages.append(
                f"User '{user_email}' is not part of the project {project_id}"
            )

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing whiteboards:\n"
            + "\n".join(error_messages)
        )
        raise ImportWhiteboardsError(errors=error_messages)

    # Everything is fine, create the whiteboards
    imported_whiteboard_ids: List[int] = []
    for user_email, whiteboards in user_email_to_whiteboards.items():
        user = project_user_emails[user_email]

        for whiteboard in whiteboards:
            try:
                created_whiteboard = crud_whiteboard.create(
                    db=db,
                    create_dto=WhiteboardCreateIntern(
                        title=whiteboard.whiteboard_title,
                        content=whiteboard.content,
                        project_id=project_id,
                        user_id=user.id,
                    ),
                )
                imported_whiteboard_ids.append(created_whiteboard.id)

                logger.info(
                    f"Created whiteboard '{whiteboard.whiteboard_title}' with ID {created_whiteboard.id}"
                )

            except Exception as e:
                logger.error(
                    f"Failed to create whiteboard '{whiteboard.whiteboard_title}': {e}"
                )
                error_messages.append(
                    f"Failed to create whiteboard '{whiteboard.whiteboard_title}': {str(e)}"
                )

    # Check if there were any errors during creation
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while creating whiteboards:\n"
            + "\n".join(error_messages)
        )
        raise ImportWhiteboardsError(errors=error_messages)

    logger.info(f"Successfully imported {len(imported_whiteboard_ids)} whiteboards")
    return imported_whiteboard_ids
