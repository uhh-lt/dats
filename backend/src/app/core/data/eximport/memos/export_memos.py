from pathlib import Path
from typing import List

import pandas as pd
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.object_handle import crud_object_handle
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
from loguru import logger
from sqlalchemy.orm import Session


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
        fn=f"project_{project_id}_selected_memos",
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
        fn=f"project_{project_id}_all_memos",
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

        # Common data for all memo types
        exported_memo = MemoExportSchema(
            uuid=memo.uuid,
            starred=memo_dto.starred,
            title=memo_dto.title,
            content=memo_dto.content,
            content_json=memo_dto.content_json,
            user_email=user.email,
            attached_type=memo_dto.attached_object_type,
            attached_to="-1",
        )

        # Resolve the attached object to a unique identifier
        attached_to = crud_object_handle.resolve_handled_object(
            db=db, handle=memo.attached_to
        )
        match attached_to:
            case ProjectORM():
                exported_memo.attached_to = "project"
            case CodeORM():
                exported_memo.attached_to = attached_to.name
            case DocumentTagORM():
                exported_memo.attached_to = attached_to.name
            case SourceDocumentORM():
                exported_memo.attached_to = attached_to.filename
            case SpanAnnotationORM():
                exported_memo.attached_to = attached_to.uuid
            case BBoxAnnotationORM():
                exported_memo.attached_to = attached_to.uuid
            case SentenceAnnotationORM():
                exported_memo.attached_to = attached_to.uuid
            case _:
                raise ValueError(f"Unknown attached object type: {type(attached_to)}")

        memo_export_items.append(exported_memo)

    collection = MemoExportCollection(memos=memo_export_items)
    return collection.to_dataframe()
