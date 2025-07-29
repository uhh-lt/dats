from pathlib import Path

import pandas as pd
from core.project.project_crud import crud_project
from core.tag.document_tag_orm import DocumentTagORM
from loguru import logger
from modules.eximport.no_data_export_error import NoDataToExportError
from modules.eximport.tags.tag_export_schema import TagExportCollection, TagExportSchema
from repos.filesystem_repo import FilesystemRepo
from sqlalchemy.orm import Session


def export_all_tags(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    tags = crud_project.read(db=db, id=project_id).document_tags
    return __export_tags(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_tags",
        tags=tags,
    )


def __export_tags(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    tags: list[DocumentTagORM],
) -> Path:
    if len(tags) == 0:
        raise NoDataToExportError("No tags to export.")
    export_data = __generate_export_df_for_tags(tags=tags)
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_tags(tags: list[DocumentTagORM]) -> pd.DataFrame:
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
