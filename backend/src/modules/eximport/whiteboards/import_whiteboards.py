import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from modules.eximport.whiteboards.whiteboard_export_schema import (
    WhiteboardContentForExport,
    WhiteboardExportCollection,
)
from modules.eximport.whiteboards.whiteboard_transformations import (
    transform_content_for_import,
)
from modules.whiteboard.whiteboard_crud import crud_whiteboard
from modules.whiteboard.whiteboard_dto import WhiteboardCreateIntern


class ImportWhiteboardsError(Exception):
    """Exception raised when whiteboard import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing whiteboards: {errors}")
        self.errors = errors


def import_whiteboards_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> list[int]:
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

    error_messages = []

    # Transform the whiteboards for import
    transformed_wbs: list[WhiteboardCreateIntern] = []
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

        transformed_wbs.append(
            WhiteboardCreateIntern(
                title=wb.title,
                project_id=project_id,
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
    imported_whiteboard_ids: list[int] = []
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
