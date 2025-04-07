from pathlib import Path
from typing import List

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.memo import crud_memo
from app.core.data.crud.object_handle import crud_object_handle
from app.core.data.dto.span_annotation import (
    SpanAnnotationRead,
)
from app.core.data.eximport.memos.memo_export_schema import (
    MemoExportCollection,
    MemoExportSchema,
)
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.repo.repo_service import RepoService


def export_selected_memos(
    db: Session,
    repo: RepoService,
    project_id: int,
    memo_ids: List[int],
) -> Path:
    memos = crud_memo.read_by_ids(db=db, ids=memo_ids)
    return __export_memos(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_selected_memos_export",
        memos=memos,
    )


def export_all_memos(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    memos = crud_memo.read_by_project(db=db, project_id=project_id)
    return __export_memos(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_all_memos_export",
        memos=memos,
    )


def __export_memos(
    db: Session,
    repo: RepoService,
    fn: str,
    memos: List[MemoORM],
) -> Path:
    if len(memos) == 0:
        raise NoDataToExportError("No memos to export.")

    export_data = __generate_export_df_for_memos(db=db, memos=memos)
    return repo.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_memos(
    db: Session,
    memos: List[MemoORM],
) -> pd.DataFrame:
    logger.info(f"Exporting {len(memos)} Memos ...")

    memo_export_items = []
    for memo in memos:
        memo_dto = crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo)
        user = memo.user

        # Skip if memo doesn't have attachment
        if memo.attached_to is None:
            continue

        attached_to = crud_object_handle.resolve_handled_object(
            db=db, handle=memo.attached_to
        )

        # Common data for all memo types
        memo_data = {
            "user_first_name": user.first_name,
            "user_last_name": user.last_name,
            "starred": memo_dto.starred,
            "content": memo_dto.content,
            "attached_type": memo_dto.attached_object_type,
        }

        # Add specific data based on attachment type
        match attached_to:
            case ProjectORM():
                # Skip project memos
                continue
            case CodeORM():
                memo_data["code_name"] = attached_to.name
            case DocumentTagORM():
                memo_data["tag_name"] = attached_to.name
            case SourceDocumentORM():
                memo_data["sdoc_name"] = attached_to.filename
            case SpanAnnotationORM():
                span_read_resolved_dto = SpanAnnotationRead.model_validate(attached_to)
                memo_data["span_anno_text"] = span_read_resolved_dto.text
                memo_data["code_name"] = attached_to.code.name
                memo_data["sdoc_name"] = (
                    attached_to.annotation_document.source_document.filename
                )
            case BBoxAnnotationORM():
                memo_data["code_name"] = attached_to.code.name
                memo_data["sdoc_name"] = (
                    attached_to.annotation_document.source_document.filename
                )
            case SentenceAnnotationORM():
                memo_data["code_name"] = attached_to.code.name
                memo_data["sdoc_name"] = (
                    attached_to.annotation_document.source_document.filename
                )
            case _:
                logger.warning(f"Unknown attached object type: {type(attached_to)}")

        memo_export_items.append(MemoExportSchema(**memo_data))

    collection = MemoExportCollection(memos=memo_export_items)
    return collection.to_dataframe()
