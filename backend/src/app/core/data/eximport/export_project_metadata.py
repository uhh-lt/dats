from pathlib import Path
from typing import List

import pandas as pd
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.orm.project_metadata import ProjectMetadataORM
from app.core.data.repo.repo_service import RepoService


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
    data = [
        {
            "key": project_metadata.key,
            "metatype": project_metadata.metatype,
            "doctype": project_metadata.doctype,
            "description": project_metadata.description,
        }
        for project_metadata in project_metadatas
    ]

    return pd.DataFrame(data)
