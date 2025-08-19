from loguru import logger

from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_dto import AttachedObjectType, MemoInDB, MemoRead
from core.memo.memo_orm import MemoORM
from core.project.project_orm import ProjectORM
from core.tag.tag_orm import TagORM
from repos.db.crud_base import NoSuchElementError


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
) -> list[MemoRead]:
    if db_obj.object_handle is None:
        return []

    memo_as_in_db_dtos = [
        MemoInDB.model_validate(memo_db_obj)
        for memo_db_obj in db_obj.object_handle.attached_memos
    ]

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
            **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
            attached_object_id=db_obj.id,
            attached_object_type=object_types[type(db_obj)],
        )
        for memo_as_in_db_dto in memo_as_in_db_dtos
    ]

    return memos


def get_object_memo_for_user(
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
    user_id: int,
) -> MemoRead:
    if db_obj.object_handle is None:
        raise NoSuchElementError(MemoORM, attached_to=type(db_obj), user_id=user_id)

    memo_as_in_db_dtos = [
        MemoInDB.model_validate(memo_db_obj)
        for memo_db_obj in db_obj.object_handle.attached_memos
        if memo_db_obj.user_id == user_id
    ]

    if len(memo_as_in_db_dtos) == 0:
        raise NoSuchElementError(MemoORM, attached_to=type(db_obj), user_id=user_id)
    elif len(memo_as_in_db_dtos) > 1:
        logger.error("More than one Memo for the specified User!")

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

    # return only the first memo of a user
    # a user should only have one memo per object!
    return MemoRead(
        **memo_as_in_db_dtos[0].model_dump(exclude={"attached_to"}),
        attached_object_id=db_obj.id,
        attached_object_type=object_types[type(db_obj)],
    )
