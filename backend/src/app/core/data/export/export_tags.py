from typing import List

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.project import crud_project
from app.core.data.dto.document_tag import DocumentTagRead


def __generate_export_df_for_document_tag(db: Session, tag_id: int) -> pd.DataFrame:
    logger.info(f"Exporting DocumentTag {tag_id} ...")

    tag = crud_document_tag.read(db=db, id=tag_id)
    tag_dto = DocumentTagRead.model_validate(tag)
    applied_to_sdoc_filenames = [sdoc.filename for sdoc in tag.source_documents]
    data = {
        "tag_name": [tag_dto.name],
        "description": [tag_dto.description],
        "color": [tag_dto.color],
        "created": [tag_dto.created],
        "parent_tag_name": [None],
        "applied_to_sdoc_filenames": [applied_to_sdoc_filenames],
    }
    if tag_dto.parent_id:
        data["parent_tag_name"] = [
            DocumentTagRead.model_validate(
                crud_document_tag.read(db=db, id=tag_dto.parent_id)
            ).name
        ]

    df = pd.DataFrame(data=data)
    return df


def generate_export_dfs_for_all_document_tags_in_project(
    db: Session, project_id: int
) -> List[pd.DataFrame]:
    tags = crud_project.read(db=db, id=project_id).document_tags
    exported_tags: List[pd.DataFrame] = []
    for tag in tags:
        export_data = __generate_export_df_for_document_tag(db=db, tag_id=tag.id)
        exported_tags.append(export_data)
    return exported_tags
