from typing import TypedDict

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import AttachedObjectType, MemoCreateIntern
from core.memo.memo_utils import get_object_memo_for_user
from core.project.project_crud import crud_project
from core.tag.tag_crud import crud_tag
from modules.eximport.memos.memo_export_schema import MemoExportCollection


class ImportMemosError(Exception):
    """Exception raised when memo import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing memos: {errors}")
        self.errors = errors


class MemoCreateData(TypedDict):
    create_dto: MemoCreateIntern
    attached_to: int
    attached_type: AttachedObjectType


def import_memos_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> list[int]:
    """
    Import memos from a DataFrame into a project.
    Validates input data and ensures all required references (user) exist.

    Args:
        db: Database session
        df: DataFrame with memo data
        project_id: ID of the project to import memos into

    Returns:
        List of imported memo IDs

    Raises:
        ImportMemosError: If validation fails or any required references are missing
    """
    # Validate input data using our schema
    try:
        memo_collection = MemoExportCollection.from_dataframe(df)
    except ValueError as e:
        logger.error(f"Failed to load memo import data: {e}")
        raise ImportMemosError(errors=[f"Invalid data format for memos: {e}"])

    logger.info(f"Importing {len(memo_collection.memos)} memos...")

    # Get the project
    error_messages = []
    project = crud_project.read(db=db, id=project_id)

    # Memos need a User. We need to check if all users exist in the database
    user_emails: set[str] = set()
    for memo in memo_collection.memos:
        user_emails.add(memo.user_email)
    project_user_emails = {user.email: user for user in project.users}
    for user_email in user_emails:
        if user_email not in project_user_emails:
            error_messages.append(
                f"User '{user_email}' is not part of the project {project_id}"
            )

    # Check if the memo already exists
    for memo in memo_collection.memos:
        existing_memo = crud_memo.read_by_project_and_uuid(
            db=db, project_id=project_id, uuid=memo.uuid
        )
        if existing_memo is not None:
            error_messages.append(
                f"Memo with UUID '{memo.uuid}' already exists in project {project_id}"
            )

    # Resolve attached_to unique identifiers
    resolved_memos: list[MemoCreateData] = []
    for memo in memo_collection.memos:
        user = project_user_emails.get(memo.user_email, None)
        if user is None:
            continue

        memo_create = MemoCreateIntern(
            uuid=memo.uuid,
            project_id=project_id,
            user_id=user.id,
            title=memo.title,
            content=memo.content if memo.content else "",
            content_json=memo.content_json if memo.content_json else "",
            starred=memo.starred,
        )
        attached_type = AttachedObjectType(memo.attached_type)
        attached_to: int | None = None

        match attached_type:
            case AttachedObjectType.project:
                attached_to = project_id

            case AttachedObjectType.source_document:
                sdoc = crud_sdoc.read_by_filename(
                    db=db,
                    proj_id=project_id,
                    filename=memo.attached_to,
                    only_finished=False,
                )
                if sdoc is None:
                    error_messages.append(
                        f"Source document '{memo.attached_to}' not found in project {project_id}"
                    )
                else:
                    # Check if that source document already has a memo
                    try:
                        existing_memo = get_object_memo_for_user(
                            db_obj=sdoc,
                            user_id=user.id,
                        )
                        error_messages.append(
                            f"Source document '{memo.attached_to}' already has a memo attached to it"
                        )
                    except Exception:
                        attached_to = sdoc.id

            case AttachedObjectType.tag:
                tag = crud_tag.read_by_name_and_project(
                    db=db, project_id=project_id, name=memo.attached_to
                )
                if tag is None:
                    error_messages.append(
                        f"Document tag '{memo.attached_to}' not found in project {project_id}"
                    )
                else:
                    # Check if that document tag already has a memo
                    try:
                        existing_memo = get_object_memo_for_user(
                            db_obj=tag,
                            user_id=user.id,
                        )
                        error_messages.append(
                            f"Document tag '{memo.attached_to}' already has a memo attached to it"
                        )
                    except Exception:
                        attached_to = tag.id

            case AttachedObjectType.code:
                code = crud_code.read_by_name_and_project(
                    db=db, proj_id=project_id, code_name=memo.attached_to
                )
                if code is None:
                    error_messages.append(
                        f"Code '{memo.attached_to}' not found in project {project_id}"
                    )
                else:
                    # Check if that code already has a memo
                    try:
                        existing_memo = get_object_memo_for_user(
                            db_obj=code,
                            user_id=user.id,
                        )
                        error_messages.append(
                            f"Code '{memo.attached_to}' already has a memo attached to it"
                        )
                    except Exception:
                        attached_to = code.id

            case AttachedObjectType.bbox_annotation:
                bbox_anno = crud_bbox_anno.read_by_project_and_uuid(
                    db=db, project_id=project_id, uuid=memo.attached_to
                )
                if bbox_anno is None:
                    error_messages.append(
                        f"Bounding box annotation '{memo.attached_to}' not found in project {project_id}"
                    )
                else:
                    # Check if that bounding box annotation already has a memo
                    try:
                        existing_memo = get_object_memo_for_user(
                            db_obj=bbox_anno,
                            user_id=user.id,
                        )
                        error_messages.append(
                            f"BBox annotation '{memo.attached_to}' already has a memo attached to it"
                        )
                    except Exception:
                        attached_to = bbox_anno.id

            case AttachedObjectType.sentence_annotation:
                sentence_anno = crud_sentence_anno.read_by_project_and_uuid(
                    db=db, project_id=project_id, uuid=memo.attached_to
                )
                if sentence_anno is None:
                    error_messages.append(
                        f"Sentence annotation '{memo.attached_to}' not found in project {project_id}"
                    )
                else:
                    # Check if that sentence annotation already has a memo
                    try:
                        existing_memo = get_object_memo_for_user(
                            db_obj=sentence_anno,
                            user_id=user.id,
                        )
                        error_messages.append(
                            f"Sentence annotation '{memo.attached_to}' already has a memo attached to it"
                        )
                    except Exception:
                        attached_to = sentence_anno.id

            case AttachedObjectType.span_annotation:
                span_anno = crud_span_anno.read_by_project_and_uuid(
                    db=db, project_id=project_id, uuid=memo.attached_to
                )
                if span_anno is None:
                    error_messages.append(
                        f"Span annotation '{memo.attached_to}' not found in project {project_id}"
                    )
                else:
                    # Check if that span annotation already has a memo
                    try:
                        existing_memo = get_object_memo_for_user(
                            db_obj=span_anno,
                            user_id=user.id,
                        )
                        error_messages.append(
                            f"Span annotation '{memo.attached_to}' already has a memo attached to it"
                        )
                    except Exception:
                        attached_to = span_anno.id

            case _:
                error_messages.append(
                    f"Attached type '{attached_type}' is not supported"
                )

        if attached_to is not None:
            resolved_memos.append(
                {
                    "create_dto": memo_create,
                    "attached_to": attached_to,
                    "attached_type": attached_type,
                }
            )

    # Raise an error if any of the checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing memos:\n"
            + "\n".join(error_messages)
        )
        raise ImportMemosError(errors=error_messages)

    # Everything is fine, we can create the memos
    imported_memo_ids: list[int] = []
    for memo in resolved_memos:
        created_memo = crud_memo.create_for_attached_object(
            db=db,
            attached_object_type=memo["attached_type"],
            attached_object_id=memo["attached_to"],
            create_dto=memo["create_dto"],
        )
        imported_memo_ids.append(created_memo.id)
        logger.info(f"Successfully imported memo: {created_memo.title}")
    logger.info(
        f"Successfully imported {len(imported_memo_ids)} memos into project {project_id}"
    )
    return imported_memo_ids
