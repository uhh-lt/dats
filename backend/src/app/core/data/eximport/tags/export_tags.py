from pathlib import Path
from typing import List

import pandas as pd
from app.core.data.crud.project import crud_project
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.eximport.tags.tag_export_schema import (
    TagExportCollection,
    TagExportSchema,
)
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.repo.repo_service import RepoService
from loguru import logger
from sqlalchemy.orm import Session


def export_all_tags(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    tags = crud_project.read(db=db, id=project_id).document_tags
    return __export_tags(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_all_tags",
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
    logger.info(f"Exporting {len(tags)} Tags ...")
    tag_export_items = []
    for tag in tags:
        parent_tag_name = None
        if tag.parent_id is not None:
            parent_tag_name = tag.parent.name
        tag_export_items.append(
            TagExportSchema(
                tag_name=tag.name,
                color=tag.color,
                parent_tag_name=parent_tag_name,
                description=tag.description or "",
            )
        )
    collection = TagExportCollection(tags=tag_export_items)
    return collection.to_dataframe()
