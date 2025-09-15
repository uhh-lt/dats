from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from core.tag.tag_orm import TagORM
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.tags.tag_export_schema import TagExportCollection, TagExportSchema
from repos.filesystem_repo import FilesystemRepo


def export_all_tags(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    tags = crud_project.read(db=db, id=project_id).tags
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
    tags: list[TagORM],
) -> Path:
    if len(tags) == 0:
        raise NoDataToExportError("No tags to export.")
    export_data = __generate_export_df_for_tags(tags=tags)
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_tags(tags: list[TagORM]) -> pd.DataFrame:
    logger.info(f"Exporting {len(tags)} Tags ...")
    tag_export_items = []
    for tag in tags:
        tag_export_items.append(
            TagExportSchema(
                tag_name=tag.name,
                color=tag.color,
                parent_tag_name=tag.parent.name if tag.parent else None,
                description=tag.description or "",
            )
        )
    collection = TagExportCollection(tags=tag_export_items)
    return collection.to_dataframe()
