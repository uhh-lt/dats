import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from common.doc_type import DocType
from common.meta_type import MetaType
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from modules.eximport.project_metadata.project_metadata_export_schema import (
    ProjectMetadataExportCollection,
)


class ImportProjectMetadataError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing project metadata: {errors}")


def import_project_metadata_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> list[int]:
    """
    Import project metadata from a DataFrame into a project.
    Validates input data and ensures all required references exist.

    Args:
        db: Database session
        df: DataFrame with project metadata
        project_id: ID of the project to import metadata into

    Returns:
        List of imported project metadata IDs

    Raises:
        ImportProjectMetadataError: If validation fails
    """
    # Validate input data using our schema
    try:
        metadata_collection = ProjectMetadataExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load project metadata import data: {e}")
        raise ImportProjectMetadataError(
            errors=[f"Invalid data format for project metadata: {e}"]
        )

    logger.info(
        f"Importing {len(metadata_collection.metadata_items)} project metadata items..."
    )

    imported_pm_ids = []
    for metadata in metadata_collection.metadata_items:
        existing_pm = (
            crud_project_meta.read_by_project_and_key_and_metatype_and_doctype(
                db=db,
                project_id=project_id,
                key=metadata.key,
                metatype=metadata.metatype,
                doctype=metadata.doctype,
            )
        )
        if existing_pm:
            logger.warning(
                f"Metadata with key '{metadata.key}' and type '{metadata.metatype}' for doctype '{metadata.doctype}' already exists in project {project_id}. Skipping..."
            )
            continue

        imported_pm = crud_project_meta.create(
            db=db,
            create_dto=ProjectMetadataCreate(
                project_id=project_id,
                key=metadata.key,
                metatype=MetaType(metadata.metatype),
                read_only=metadata.read_only,
                doctype=DocType(metadata.doctype),
                description=metadata.description,
            ),
        )
        imported_pm_ids.append(imported_pm.id)

    logger.info(
        f"Successfully imported {len(imported_pm_ids)} project metadata items into project {project_id}"
    )

    return imported_pm_ids
