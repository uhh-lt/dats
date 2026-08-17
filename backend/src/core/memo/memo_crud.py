from fastapi.encoders import jsonable_encoder
from loguru import logger
from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_dto import (
    AttachedObjectType,
    MemoCreateIntern,
    MemoInDB,
    MemoRead,
    MemoUpdate,
)
from core.memo.memo_elastic_crud import crud_elastic_memo
from core.memo.memo_elastic_dto import ElasticSearchMemoCreate, ElasticSearchMemoUpdate
from core.memo.memo_orm import MemoFavoriteLinkTable, MemoORM
from core.memo.object_handle_dto import ObjectHandleCreate
from core.memo.object_handle_orm import ObjectHandleORM
from core.project.project_orm import ProjectORM
from core.tag.tag_orm import TagORM
from repos.db.crud_base import CRUDBase
from repos.elastic.elastic_repo import ElasticSearchRepo


class CRUDMemo(CRUDBase[MemoORM, MemoCreateIntern, MemoUpdate]):
    ### CREATE OPERATIONS ###

    def create(self, db: Session, *, create_dto: MemoCreateIntern) -> MemoORM:
        raise NotImplementedError()

    def __create_memo(
        self, create_dto: MemoCreateIntern, db: Session, oh_db_obj: ObjectHandleORM
    ):
        # create the Memo
        dto_obj_data = jsonable_encoder(create_dto)
        dto_obj_data["attached_to_id"] = oh_db_obj.id
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.flush()
        db.refresh(db_obj)

        return db_obj

    def create_for_attached_object(
        self,
        db: Session,
        attached_object_id: int,
        attached_object_type: AttachedObjectType,
        create_dto: MemoCreateIntern,
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from core.memo.object_handle_crud import crud_object_handle

        # create an ObjectHandle for the attached object
        oh_create_dto = None
        match attached_object_type:
            case AttachedObjectType.code:
                oh_create_dto = ObjectHandleCreate(code_id=attached_object_id)
            case AttachedObjectType.span_annotation:
                oh_create_dto = ObjectHandleCreate(
                    span_annotation_id=attached_object_id
                )
            case AttachedObjectType.sentence_annotation:
                oh_create_dto = ObjectHandleCreate(
                    sentence_annotation_id=attached_object_id
                )
            case AttachedObjectType.span_group:
                oh_create_dto = ObjectHandleCreate(span_group_id=attached_object_id)
            case AttachedObjectType.bbox_annotation:
                oh_create_dto = ObjectHandleCreate(
                    bbox_annotation_id=attached_object_id
                )
            case AttachedObjectType.source_document:
                oh_create_dto = ObjectHandleCreate(
                    source_document_id=attached_object_id
                )
            case AttachedObjectType.project:
                oh_create_dto = ObjectHandleCreate(project_id=attached_object_id)
            case AttachedObjectType.tag:
                oh_create_dto = ObjectHandleCreate(tag_id=attached_object_id)
        assert oh_create_dto is not None, (
            f"Unknown AttachedObjectType: {attached_object_type}"
        )

        # create an ObjectHandle for the attached object
        oh_db_obj = crud_object_handle.create(db=db, create_dto=oh_create_dto)
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.create_memo_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=attached_object_id,
            attached_object_type=attached_object_type,
        )
        return db_obj

    @staticmethod
    def create_memo_elasticsearch(
        memo_orm: MemoORM,
        attached_object_id: int,
        attached_object_type: AttachedObjectType,
    ):
        esmemo = ElasticSearchMemoCreate(
            title=memo_orm.title,
            content=memo_orm.content,
            memo_id=memo_orm.id,
            project_id=memo_orm.project_id,
            user_id=memo_orm.user_id,
            attached_object_id=attached_object_id,
            attached_object_type=attached_object_type,
        )
        crud_elastic_memo.create(
            client=ElasticSearchRepo().get_client(),
            create_dto=esmemo,
            proj_id=memo_orm.project_id,
        )

    ### READ OPERATIONS ###

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
    ) -> list[MemoORM]:
        query = db.query(self.model).where(
            self.model.project_id == project_id,
        )
        return query.all()

    def read_by_project_and_uuid(
        self,
        db: Session,
        *,
        project_id: int,
        uuid: str,
    ) -> MemoORM | None:
        query = db.query(self.model).where(
            self.model.project_id == project_id,
            self.model.uuid == uuid,
        )
        return query.first()

    ### UPDATE OPERATIONS ###

    def update(self, db: Session, *, id: int, update_dto: MemoUpdate) -> MemoORM:
        updated_memo = super().update(db, id=id, update_dto=update_dto)
        self.update_memo_elasticsearch(updated_memo)
        return updated_memo

    @staticmethod
    def update_memo_elasticsearch(
        memo_orm: MemoORM,
    ):
        update_es_dto = ElasticSearchMemoUpdate(
            title=memo_orm.title,
            content=memo_orm.content,
        )

        crud_elastic_memo.update(
            client=ElasticSearchRepo().get_client(),
            id=memo_orm.id,
            update_dto=update_es_dto,
            proj_id=memo_orm.project_id,
        )

    ### DELETE OPERATIONS ###

    def delete(self, db: Session, *, id: int) -> MemoORM:
        db_obj = self.read(db=db, id=id)
        try:
            crud_elastic_memo.delete(
                client=ElasticSearchRepo().get_client(),
                id=db_obj.id,
                proj_id=db_obj.project_id,
            )
        except Exception:
            logger.exception(
                "Failed to remove Memo {} from Elasticsearch project {}",
                db_obj.id,
                db_obj.project_id,
            )
        return super().delete(db=db, id=id)

    # TODO Flo: Not sure if this actually belongs here...
    @staticmethod
    def get_memo_read_dto_from_orm(
        db: Session, db_obj: MemoORM, user_id: int | None = None
    ) -> MemoRead:
        # Flo: this is necessary to avoid circular imports.
        from core.memo.object_handle_crud import crud_object_handle

        attached_to = crud_object_handle.resolve_handled_object(
            db=db, handle=db_obj.attached_to
        )

        memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
        favorite = (
            crud_memo.is_favorited(db, memo_id=db_obj.id, user_id=user_id)
            if user_id is not None
            else False
        )
        memo_data = memo_as_in_db_dto.model_dump(exclude={"attached_to", "is_favorite"})
        if isinstance(attached_to, CodeORM):
            return MemoRead(
                **memo_data,
                is_favorite=favorite,
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.code,
            )
        elif isinstance(attached_to, SpanAnnotationORM):
            return MemoRead(
                **memo_data,
                is_favorite=favorite,
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.span_annotation,
            )
        elif isinstance(attached_to, SpanGroupORM):
            return MemoRead(
                **memo_data,
                is_favorite=favorite,
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.span_group,
            )
        elif isinstance(attached_to, BBoxAnnotationORM):
            return MemoRead(
                **memo_data,
                is_favorite=favorite,
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.bbox_annotation,
            )
        elif isinstance(attached_to, SentenceAnnotationORM):
            return MemoRead(
                **memo_data,
                is_favorite=favorite,
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.sentence_annotation,
            )
        elif isinstance(attached_to, SourceDocumentORM):
            return MemoRead(
                **memo_data,
                is_favorite=favorite,
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.source_document,
            )
        elif isinstance(attached_to, ProjectORM):
            return MemoRead(
                **memo_data,
                is_favorite=favorite,
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.project,
            )
        elif isinstance(attached_to, TagORM):
            return MemoRead(
                **memo_data,
                is_favorite=favorite,
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.tag,
            )
        else:
            raise NotImplementedError(
                f"Unknown AttachedObjectType: {type(attached_to)}"
            )

    ### FAVORITE OPERATIONS ###

    def favorite(self, db: Session, *, memo_id: int, user_id: int) -> None:
        self.exists(db, id=memo_id, raise_error=True)

        from sqlalchemy.dialects.postgresql import insert

        insert_stmt = insert(MemoFavoriteLinkTable).on_conflict_do_nothing()
        db.execute(insert_stmt, [{"memo_id": memo_id, "user_id": user_id}])
        db.flush()

    def unfavorite(self, db: Session, *, memo_id: int, user_id: int) -> None:
        from sqlalchemy import delete

        stmt = delete(MemoFavoriteLinkTable).where(
            MemoFavoriteLinkTable.memo_id == memo_id,
            MemoFavoriteLinkTable.user_id == user_id,
        )
        db.execute(stmt)
        db.flush()

    def is_favorited(self, db: Session, *, memo_id: int, user_id: int) -> bool:
        return (
            db.query(MemoFavoriteLinkTable.memo_id)
            .filter(
                MemoFavoriteLinkTable.memo_id == memo_id,
                MemoFavoriteLinkTable.user_id == user_id,
            )
            .first()
            is not None
        )


crud_memo = CRUDMemo(MemoORM)
