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
from app.core.data.export.no_data_export_error import NoDataToExportError
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
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

    datas = []
    for memo in memos:
        memo_dto = crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo)
        user = memo.user

        # get attached object
        assert memo.attached_to is not None
        attached_to = crud_object_handle.resolve_handled_object(
            db=db, handle=memo.attached_to
        )

        # common data
        data = {
            "memo_id": [memo.id],
            "user_id": [user.id],
            "user_first_name": [user.first_name],
            "user_last_name": [user.last_name],
            "created": [memo_dto.created],
            "updated": [memo_dto.updated],
            "starred": [memo_dto.starred],
            "attached_to": [memo_dto.attached_object_type],
            "content": [memo_dto.content],
            "sdoc_name": [None],
            "tag_name": [None],
            "span_group_name": [None],
            "code_name": [None],
            "span_anno_text": [None],
        }

        match attached_to:
            case CodeORM():
                data["code_name"] = [attached_to.name]
                break
            case SpanGroupORM():
                data["span_group_name"] = [attached_to.name]
            case SourceDocumentORM():
                data["sdoc_name"] = [attached_to.filename]
            case DocumentTagORM():
                data["tag_name"] = [attached_to.name]
            case ProjectORM():
                logger.warning("LogBook Export still todo!")
                continue
            case SpanAnnotationORM():
                span_read_resolved_dto = SpanAnnotationRead.model_validate(attached_to)
                data["span_anno_text"] = [span_read_resolved_dto.text]
                data["code_name"] = [attached_to.code.name]
            case BBoxAnnotationORM():
                data["code_name"] = [attached_to.code.name]
            case _:
                logger.warning(f"Unknown attached object type: {type(attached_to)}")

        datas.append(data)

    return pd.DataFrame(datas)
