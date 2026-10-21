from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from core.memo.memo_dto import MemoCreateIntern, MemoUpdate
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_orm import MemoFavoriteLinkTable, MemoORM, MemoRecentORM
from core.memo.object_handle_dto import ObjectHandleCreate
from core.memo.object_handle_orm import ObjectHandleORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDMemo(SQLCRUDBase[MemoORM, MemoCreateIntern, MemoUpdate]):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, create_dtos: list[MemoCreateIntern]
    ) -> list[MemoORM]:
        # a memo needs an object handle: use create_for_attached_object
        raise NotImplementedError()

    def _create_memo(
        self, db: Session, *, create_dto: MemoCreateIntern, oh_db_obj: ObjectHandleORM
    ) -> MemoORM:
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
        *,
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
        db_obj = self._create_memo(db=db, create_dto=create_dto, oh_db_obj=oh_db_obj)
        return db_obj

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

    def read_recents(
        self, db: Session, *, user_id: int, project_id: int, limit: int
    ) -> list[MemoORM]:
        """Return the user's most recently opened memos in a project, newest first."""
        return (
            db.query(MemoORM)
            .join(MemoRecentORM, MemoRecentORM.memo_id == MemoORM.id)
            .filter(
                MemoRecentORM.user_id == user_id,
                MemoORM.project_id == project_id,
            )
            .order_by(MemoRecentORM.last_opened.desc())
            .limit(limit)
            .all()
        )

    ### UPDATE OPERATIONS ###

    def update_recent(self, db: Session, *, memo_id: int, user_id: int) -> None:
        """Upsert a (user, memo) recents row, bumping last_opened to now."""
        from sqlalchemy.dialects.postgresql import insert

        insert_stmt = insert(MemoRecentORM).values(memo_id=memo_id, user_id=user_id)
        upsert_stmt = insert_stmt.on_conflict_do_update(
            index_elements=["user_id", "memo_id"],
            set_={"last_opened": insert_stmt.excluded.last_opened},
        )
        db.execute(upsert_stmt)
        db.flush()

    ### DELETE OPERATIONS ###
    # Inherited from SQLCRUDBase

    ### OTHER OPERATIONS ###

    def favorite(self, db: Session, *, memo_id: int, user_id: int) -> None:
        self.favorite_multi(db=db, memo_ids=[memo_id], user_id=user_id)

    def favorite_multi(self, db: Session, *, memo_ids: list[int], user_id: int) -> None:
        """
        Favorite memos for a user; already favorited memos are skipped.

        Raises:
            NoSuchElementError: If any memo does not exist.
        """
        if not memo_ids:
            return
        self.read_by_ids(db=db, ids=memo_ids)

        from sqlalchemy.dialects.postgresql import insert

        unique_ids = list(dict.fromkeys(memo_ids))
        insert_stmt = insert(MemoFavoriteLinkTable).on_conflict_do_nothing()
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            db.execute(
                insert_stmt,
                [{"memo_id": memo_id, "user_id": user_id} for memo_id in batch_ids],
            )
        db.flush()

    def unfavorite(self, db: Session, *, memo_id: int, user_id: int) -> None:
        self.unfavorite_multi(db=db, memo_ids=[memo_id], user_id=user_id)

    def unfavorite_multi(
        self, db: Session, *, memo_ids: list[int], user_id: int
    ) -> None:
        """Remove the favorite of a user from memos; memos without one are skipped."""
        if not memo_ids:
            return

        from sqlalchemy import delete

        unique_ids = list(dict.fromkeys(memo_ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            db.execute(
                delete(MemoFavoriteLinkTable).where(
                    MemoFavoriteLinkTable.memo_id.in_(batch_ids),
                    MemoFavoriteLinkTable.user_id == user_id,
                )
            )
        db.flush()

    def exists_favorite(self, db: Session, *, memo_id: int, user_id: int) -> bool:
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
