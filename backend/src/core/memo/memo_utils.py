from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_dto import AttachedObjectType, MemoInDB, MemoRead
from core.memo.memo_orm import MemoFavoriteLinkTable
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
    favorite_ids = {
        row[0]
        for row in db.query(MemoFavoriteLinkTable.memo_id)
        .filter(
            MemoFavoriteLinkTable.user_id == user_id,
            MemoFavoriteLinkTable.memo_id.in_([memo.id for memo in memo_as_in_db_dtos]),
        )
        .all()
    }

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
