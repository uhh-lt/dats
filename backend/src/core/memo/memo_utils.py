from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoInDB, MemoRead
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_orm import ObjectHandleORM
from core.project.project_orm import ProjectORM
from core.tag.tag_orm import TagORM


def get_object_memos(
    db_obj: (
        SourceDocumentORM
        | TagORM
        | CodeORM
        | ProjectORM
        | BBoxAnnotationORM
        | SentenceAnnotationORM
        | SpanAnnotationORM
        | SpanGroupORM
    ),
    db: Session,
    user_id: int,
) -> list[MemoRead]:
    if db_obj.object_handle is None:
        return []

    memo_as_in_db_dtos = [
        MemoInDB.model_validate(memo_db_obj)
        for memo_db_obj in db_obj.object_handle.attached_memos
    ]
    favorite_ids = crud_memo.read_favorite_ids(
        db=db, memo_ids=[memo.id for memo in memo_as_in_db_dtos], user_id=user_id
    )

    object_types = {
        SourceDocumentORM: AttachedObjectType.source_document,
        TagORM: AttachedObjectType.tag,
        CodeORM: AttachedObjectType.code,
        ProjectORM: AttachedObjectType.project,
        BBoxAnnotationORM: AttachedObjectType.bbox_annotation,
        SpanAnnotationORM: AttachedObjectType.span_annotation,
        SentenceAnnotationORM: AttachedObjectType.sentence_annotation,
        SpanGroupORM: AttachedObjectType.span_group,
    }

    memos = [
        MemoRead(
            **memo_as_in_db_dto.model_dump(exclude={"attached_to", "is_favorite"}),
            is_favorite=memo_as_in_db_dto.id in favorite_ids,
            attached_object_id=db_obj.id,
            attached_object_type=object_types[type(db_obj)],
        )
        for memo_as_in_db_dto in memo_as_in_db_dtos
    ]

    return memos


# the ObjectHandle column that refers to each type a memo can be attached to
_HANDLE_COLUMN_TO_ATTACHED_OBJECT_TYPE = {
    "code_id": AttachedObjectType.code,
    "span_annotation_id": AttachedObjectType.span_annotation,
    "span_group_id": AttachedObjectType.span_group,
    "bbox_annotation_id": AttachedObjectType.bbox_annotation,
    "sentence_annotation_id": AttachedObjectType.sentence_annotation,
    "source_document_id": AttachedObjectType.source_document,
    "project_id": AttachedObjectType.project,
    "tag_id": AttachedObjectType.tag,
}


def _get_attached_object(handle: ObjectHandleORM) -> tuple[int, AttachedObjectType]:
    """The id and type of the object a memo's handle refers to."""
    for column, attached_object_type in _HANDLE_COLUMN_TO_ATTACHED_OBJECT_TYPE.items():
        object_id = getattr(handle, column)
        if object_id is not None:
            return object_id, attached_object_type
    raise NotImplementedError(f"ObjectHandle {handle.id} refers to no memo target")


def get_memo_read_dto_from_orm(
    db: Session, *, db_obj: MemoORM, user_id: int | None = None
) -> MemoRead:
    return get_memo_read_dtos_from_orms(db=db, db_objs=[db_obj], user_id=user_id)[0]


def get_memo_read_dtos_from_orms(
    db: Session, *, db_objs: list[MemoORM], user_id: int | None = None
) -> list[MemoRead]:
    """
    Build the Read DTOs of memos with a constant number of queries: the attached
    object comes from the memo's object handle (eager-loaded by crud_memo's reads),
    the favorites of the user are read in one batch.

    Args:
        db_objs: The memos.
        user_id: The requesting user, whose favorites `is_favorite` shows. Without
            one, no memo is a favorite.

    Returns:
        The memos, in the order of `db_objs`.
    """
    favorite_ids = (
        crud_memo.read_favorite_ids(
            db=db, memo_ids=[db_obj.id for db_obj in db_objs], user_id=user_id
        )
        if user_id is not None
        else set()
    )

    results: list[MemoRead] = []
    for db_obj in db_objs:
        attached_object_id, attached_object_type = _get_attached_object(
            db_obj.attached_to
        )
        memo_data = MemoInDB.model_validate(db_obj).model_dump(
            exclude={"attached_to_id", "is_favorite"}
        )
        results.append(
            MemoRead(
                **memo_data,
                is_favorite=db_obj.id in favorite_ids,
                attached_object_id=attached_object_id,
                attached_object_type=attached_object_type,
            )
        )
    return results
