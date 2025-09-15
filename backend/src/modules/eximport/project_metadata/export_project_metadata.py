from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.project.project_crud import crud_project
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.project_metadata.project_metadata_export_schema import (
    ProjectMetadataExportCollection,
    ProjectMetadataExportSchema,
)
from repos.filesystem_repo import FilesystemRepo


def export_all_project_metadatas(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    project_metadatas = crud_project.read(db=db, id=project_id).metadata_
    return __export_project_metadatas(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_project_metadatas",
        project_metadatas=project_metadatas,
    )


def __export_project_metadatas(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    project_metadatas: list[ProjectMetadataORM],
) -> Path:
    if len(project_metadatas) == 0:
        raise NoDataToExportError("No project metadata to export.")

    export_data = __generate_export_df_for_project_metadata(
        project_metadatas=project_metadatas
    )
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_project_metadata(
    project_metadatas: list[ProjectMetadataORM],
) -> pd.DataFrame:
    logger.info(f"Exporting {len(project_metadatas)} Project Metadata items...")
    metadata_export_items = []

    for metadata in project_metadatas:
        metadata_export_items.append(
            ProjectMetadataExportSchema(
                key=metadata.key,
                metatype=metadata.metatype,
                doctype=metadata.doctype,
                description=metadata.description,
                read_only=metadata.read_only,
            )
        )

    collection = ProjectMetadataExportCollection(metadata_items=metadata_export_items)
    return collection.to_dataframe()
