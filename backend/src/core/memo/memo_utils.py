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
from core.memo.memo_orm import MemoFavoriteLinkTable, MemoORM
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


def get_memo_read_dto_from_orm(
    db: Session, *, db_obj: MemoORM, user_id: int | None = None
) -> MemoRead:
    from core.memo.object_handle_crud import crud_object_handle

    attached_to = crud_object_handle.read_handled_object(
        db=db, handle=db_obj.attached_to
    )

    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    favorite = (
        crud_memo.exists_favorite(db=db, memo_id=db_obj.id, user_id=user_id)
        if user_id is not None
        else False
    )
    memo_data = memo_as_in_db_dto.model_dump(exclude={"attached_to", "is_favorite"})
    object_types = {
        CodeORM: AttachedObjectType.code,
        SpanAnnotationORM: AttachedObjectType.span_annotation,
        SpanGroupORM: AttachedObjectType.span_group,
        BBoxAnnotationORM: AttachedObjectType.bbox_annotation,
        SentenceAnnotationORM: AttachedObjectType.sentence_annotation,
        SourceDocumentORM: AttachedObjectType.source_document,
        ProjectORM: AttachedObjectType.project,
        TagORM: AttachedObjectType.tag,
    }
    for orm_type, attached_object_type in object_types.items():
        if attached_to is not None and isinstance(attached_to, orm_type):
            return MemoRead(
                **memo_data,
                is_favorite=favorite,
                attached_object_id=attached_to.id,
                attached_object_type=attached_object_type,
            )
    raise NotImplementedError(f"Unknown AttachedObjectType: {type(attached_to)}")
