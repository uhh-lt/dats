from pathlib import Path
from typing import List

import pandas as pd
from app.core.data.crud.project import crud_project
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.eximport.project_metadata.project_metadata_export_schema import (
    ProjectMetadataExportCollection,
    ProjectMetadataExportSchema,
)
from app.core.data.orm.project_metadata import ProjectMetadataORM
from app.core.data.repo.repo_service import RepoService
from loguru import logger
from sqlalchemy.orm import Session


def export_all_project_metadatas(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    project_metadatas = crud_project.read(db=db, id=project_id).metadata_
    return __export_project_metadatas(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_project_metadatas",
        project_metadatas=project_metadatas,
    )


def __export_project_metadatas(
    db: Session,
    repo: RepoService,
    fn: str,
    project_metadatas: List[ProjectMetadataORM],
) -> Path:
    if len(project_metadatas) == 0:
        raise NoDataToExportError("No project metadata to export.")

    export_data = __generate_export_df_for_project_metadata(
        project_metadatas=project_metadatas
    )
    return repo.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_project_metadata(
    project_metadatas: List[ProjectMetadataORM],
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
