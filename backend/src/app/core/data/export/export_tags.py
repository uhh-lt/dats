from pathlib import Path
from typing import List

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.export.no_data_export_error import NoDataToExportError
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.repo.repo_service import RepoService


def export_all_tags(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    tags = crud_project.read(db=db, id=project_id).document_tags
    return __export_tags(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_tags",
        tags=tags,
    )


def __export_tags(
    db: Session,
    repo: RepoService,
    fn: str,
    tags: List[DocumentTagORM],
) -> Path:
    if len(tags) == 0:
        raise NoDataToExportError("No tags to export.")

    export_data = __generate_export_df_for_tags(tags=tags)
    return repo.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_tags(tags: List[DocumentTagORM]) -> pd.DataFrame:
    logger.info(f"Exporting {len(tags)} tags ...")

    # fill the DataFrame
    data = {
        "tag_name": [],
        "description": [],
        "color": [],
        "created": [],
        "parent_tag_name": [],
        "applied_to_sdoc_filenames": [],
    }

    for tag in tags:
        parent_tag_name = None
        if tag.parent_id is not None:
            parent_tag_name = tag.parent.name
        applied_to_sdoc_filenames = [sdoc.filename for sdoc in tag.source_documents]
        data["tag_name"].append(tag.name)
        data["description"].append(tag.description)
        data["color"].append(tag.color)
        data["created"].append(tag.created)
        data["parent_tag_name"].append(parent_tag_name)
        data["applied_to_sdoc_filenames"].append(applied_to_sdoc_filenames)

    return pd.DataFrame(data)
