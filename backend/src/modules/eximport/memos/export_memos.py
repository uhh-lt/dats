from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_crud import crud_object_handle
from core.project.project_orm import ProjectORM
from core.tag.tag_orm import TagORM
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.memos.memo_export_schema import (
    MemoExportCollection,
    MemoExportSchema,
)
from repos.filesystem_repo import FilesystemRepo


def export_selected_memos(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
    memo_ids: list[int],
) -> Path:
    memos = crud_memo.read_by_ids(db=db, ids=memo_ids)
    return __export_memos(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_selected_memos",
        memos=memos,
    )


def export_all_memos(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    memos = crud_memo.read_by_project(db=db, project_id=project_id)
    return __export_memos(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_memos",
        memos=memos,
    )


def __export_memos(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    memos: list[MemoORM],
) -> Path:
    if len(memos) == 0:
        raise NoDataToExportError("No memos to export.")

    export_data = __generate_export_df_for_memos(db=db, memos=memos)
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_memos(
    db: Session,
    memos: list[MemoORM],
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
            case TagORM():
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
