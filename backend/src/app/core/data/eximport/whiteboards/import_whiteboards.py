from typing import List, Set

import pandas as pd
from app.core.data.crud.project import crud_project
from app.core.data.crud.whiteboard import crud_whiteboard
from app.core.data.dto.whiteboard import WhiteboardCreateIntern
from app.core.data.eximport.whiteboards.whiteboard_export_schema import (
    WhiteboardContentForExport,
    WhiteboardExportCollection,
)
from app.core.data.eximport.whiteboards.whiteboard_transformations import (
    transform_content_for_import,
)
from loguru import logger
from sqlalchemy.orm import Session


class ImportWhiteboardsError(Exception):
    """Exception raised when whiteboard import fails."""

    def __init__(self, errors: List[str]) -> None:
        super().__init__(f"Errors occurred while importing whiteboards: {errors}")
        self.errors = errors


def import_whiteboards_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> List[int]:
    """
    Import whiteboards from a DataFrame into a project.
    Validates input data and ensures all required references (user) exist.

    Args:
        db: Database session
        df: DataFrame with whiteboard data
        project_id: ID of the project to import whiteboards into

    Returns:
        List of imported whiteboard IDs

    Raises:
        ImportWhiteboardsError: If validation fails or any required references are missing
    """
    # Validate input data using our schema
    try:
        whiteboard_collection = WhiteboardExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load whiteboard import data: {e}")
        raise ImportWhiteboardsError(
            errors=[f"Invalid data format for whiteboards: {e}"]
        )

    logger.info(f"Importing {len(whiteboard_collection.whiteboards)} whiteboards...")

    # Get the project
    error_messages = []
    project = crud_project.read(db=db, id=project_id)

    # Whiteboards need a User. We need to check if all users exist in the database
    user_emails: Set[str] = set()
    for whiteboard in whiteboard_collection.whiteboards:
        user_emails.add(whiteboard.user_email)
    project_user_emails = {user.email: user for user in project.users}
    for user_email in user_emails:
        if user_email not in project_user_emails:
            error_messages.append(
                f"User '{user_email}' is not part of the project {project_id}"
            )

    # Transform the whiteboards for import
    transformed_wbs: List[WhiteboardCreateIntern] = []
    for wb in whiteboard_collection.whiteboards:
        try:
            content = WhiteboardContentForExport.model_validate_json(wb.content)
            transformed_content, errors = transform_content_for_import(
                db=db, project_id=project_id, content=content
            )
            error_messages.extend(errors)
        except Exception as e:
            error_messages.append(f"An error occured for whiteboard '{wb.title}': {e}")
            continue

        user = project_user_emails.get(wb.user_email, None)
        if user is None:
            continue

        transformed_wbs.append(
            WhiteboardCreateIntern(
                title=wb.title,
                project_id=project_id,
                user_id=user.id,
                content=transformed_content.model_dump_json(),
            )
        )

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing whiteboards:\n"
            + "\n".join(error_messages)
        )
        raise ImportWhiteboardsError(errors=error_messages)

    # Everything is fine, we can create the whiteboards
    imported_whiteboard_ids: List[int] = []
    for wb in transformed_wbs:
        created_whiteboard = crud_whiteboard.create(
            db=db,
            create_dto=wb,
        )
        imported_whiteboard_ids.append(created_whiteboard.id)
        logger.info(f"Successfully imported whiteboard: {created_whiteboard.title}")
    logger.info(
        f"Successfully imported {len(imported_whiteboard_ids)} whiteboards into project {project_id}"
    )
    return imported_whiteboard_ids
