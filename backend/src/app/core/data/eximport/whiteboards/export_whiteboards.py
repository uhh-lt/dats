from pathlib import Path
from typing import List

import pandas as pd
from app.core.data.crud.whiteboard import crud_whiteboard
from app.core.data.dto.whiteboard import WhiteboardRead
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.eximport.whiteboards.whiteboard_export_schema import (
    WhiteboardExportCollection,
    WhiteboardExportSchema,
)
from app.core.data.eximport.whiteboards.whiteboard_transformations import (
    transform_content_for_export,
)
from app.core.data.orm.whiteboard import WhiteboardORM
from app.core.data.repo.repo_service import RepoService
from loguru import logger
from sqlalchemy.orm import Session


def export_selected_whiteboards(
    db: Session,
    repo: RepoService,
    project_id: int,
    whiteboard_ids: List[int],
) -> Path:
    """
    Export selected whiteboards by their IDs.

    Args:
        db: Database session
        repo: Repository service for file operations
        project_id: ID of the project containing the whiteboards
        whiteboard_ids: List of whiteboard IDs to export

    Returns:
        Path to the exported CSV file

    Raises:
        NoDataToExportError: If no whiteboards are found to export
    """
    whiteboards = crud_whiteboard.read_by_ids(db=db, ids=whiteboard_ids)
    return __export_whiteboards(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_selected_whiteboards",
        whiteboards=whiteboards,
    )


def export_all_whiteboards(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    """
    Export all whiteboards in a project to a CSV file.

    Args:
        db: Database session
        repo: Repository service for file operations
        project_id: ID of the project containing the whiteboards

    Returns:
        Path to the exported CSV file

    Raises:
        NoDataToExportError: If no whiteboards are found to export
    """
    whiteboards = crud_whiteboard.read_by_project(db=db, project_id=project_id)
    return __export_whiteboards(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_all_whiteboards",
        whiteboards=whiteboards,
    )


def __export_whiteboards(
    db: Session,
    repo: RepoService,
    fn: str,
    whiteboards: List[WhiteboardORM],
) -> Path:
    """
    Export a list of whiteboards to a CSV file.

    Args:
        db: Database session
        repo: Repository service for file operations
        fn: Base filename for the export
        whiteboards: List of whiteboards to export

    Returns:
        Path to the exported CSV file

    Raises:
        NoDataToExportError: If no whiteboards are provided
    """
    if len(whiteboards) == 0:
        raise NoDataToExportError("No whiteboards to export.")

    export_data = __generate_export_df_for_whiteboards(db=db, whiteboards=whiteboards)
    return repo.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_whiteboards(
    db: Session,
    whiteboards: List[WhiteboardORM],
) -> pd.DataFrame:
    """
    Generate a DataFrame from a list of whiteboards.

    Args:
        db: Database session
        whiteboards: List of whiteboard ORM objects

    Returns:
        DataFrame containing the whiteboard data
    """
    logger.info(f"Exporting {len(whiteboards)} whiteboards...")
    whiteboard_export_items = []

    for wb in whiteboards:
        wb_dto = WhiteboardRead.model_validate(wb)

        # Transform the whiteboard content for export
        transformed_content = transform_content_for_export(
            db=db, content=wb_dto.content
        )

        whiteboard_export_items.append(
            WhiteboardExportSchema(
                title=wb.title,
                user_email=wb.user.email,
                content=transformed_content.model_dump_json(),
            )
        )

    collection = WhiteboardExportCollection(whiteboards=whiteboard_export_items)
    return collection.to_dataframe()
