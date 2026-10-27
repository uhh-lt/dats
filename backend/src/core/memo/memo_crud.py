from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.base import ExecutableOption

from core.memo.memo_dto import MemoCreateIntern, MemoUpdate
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_orm import MemoFavoriteLinkTable, MemoORM, MemoRecentORM
from core.memo.object_handle_dto import ObjectHandleCreate
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDMemo(SQLCRUDBase[MemoORM, MemoCreateIntern, MemoUpdate]):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, create_dtos: list[MemoCreateIntern]
    ) -> list[MemoORM]:
        # a memo needs an object handle: use create_multi_for_attached_objects
        raise NotImplementedError()

    def create_for_attached_object(
        self,
        db: Session,
        *,
        attached_object_id: int,
        attached_object_type: AttachedObjectType,
        create_dto: MemoCreateIntern,
    ) -> MemoORM:
        return self.create_multi_for_attached_objects(
            db=db,
            attached_object_type=attached_object_type,
            attached_object_ids=[attached_object_id],
            create_dtos=[create_dto],
        )[0]

    def create_multi_for_attached_objects(
        self,
        db: Session,
        *,
        attached_object_type: AttachedObjectType,
        attached_object_ids: list[int],
        create_dtos: list[MemoCreateIntern],
    ) -> list[MemoORM]:
        """
        Create memos attached to objects of one type, with a constant number of
        queries: the missing object handles are created in one batch, the memos
        with one flush.

        Args:
            attached_object_type: The type of the objects the memos are attached to.
            attached_object_ids: The object each memo is attached to, parallel to
                `create_dtos`. An object may get several memos.
            create_dtos: The memos to create.

        Returns:
            The created memos, in the order of `create_dtos`.
        """
        # Flo: this is necessary to avoid circular imports.
        from core.memo.object_handle_crud import crud_object_handle

        if len(attached_object_ids) != len(create_dtos):
            raise ValueError(
                f"Got {len(attached_object_ids)} attached objects for "
                f"{len(create_dtos)} memos."
            )
        if not create_dtos:
            return []

        # 1) find or create the object handle of every attached object
        oh_db_objs = crud_object_handle.create_multi(
            db=db,
            create_dtos=[
                self._object_handle_create_dto(
                    attached_object_id=attached_object_id,
                    attached_object_type=attached_object_type,
                )
                for attached_object_id in attached_object_ids
            ],
        )

        # 2) create the memos, linked to the object handles via the relationship, so
        # that reading memo.attached_to needs no query
        # noinspection PyArgumentList
        db_objs = [
            self.model(**jsonable_encoder(create_dto), attached_to=oh_db_obj)
            for create_dto, oh_db_obj in zip(create_dtos, oh_db_objs)
        ]
        db.add_all(db_objs)
        db.flush()

        return db_objs

    def _object_handle_create_dto(
        self, *, attached_object_id: int, attached_object_type: AttachedObjectType
    ) -> ObjectHandleCreate:
        """The object handle that refers to the attached object."""
        match attached_object_type:
            case AttachedObjectType.code:
                return ObjectHandleCreate(code_id=attached_object_id)
            case AttachedObjectType.span_annotation:
                return ObjectHandleCreate(span_annotation_id=attached_object_id)
            case AttachedObjectType.sentence_annotation:
                return ObjectHandleCreate(sentence_annotation_id=attached_object_id)
            case AttachedObjectType.span_group:
                return ObjectHandleCreate(span_group_id=attached_object_id)
            case AttachedObjectType.bbox_annotation:
                return ObjectHandleCreate(bbox_annotation_id=attached_object_id)
            case AttachedObjectType.source_document:
                return ObjectHandleCreate(source_document_id=attached_object_id)
            case AttachedObjectType.project:
                return ObjectHandleCreate(project_id=attached_object_id)
            case AttachedObjectType.tag:
                return ObjectHandleCreate(tag_id=attached_object_id)

    ### READ OPERATIONS ###

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
    ) -> list[MemoORM]:
        query = (
            db.query(self.model)
            .options(*self._load_options())
            .where(
                self.model.project_id == project_id,
            )
        )
        return query.all()

    def read_by_project_and_uuid(
        self,
        db: Session,
        *,
        project_id: int,
        uuid: str,
    ) -> MemoORM | None:
        query = (
            db.query(self.model)
            .options(*self._load_options())
            .where(
                self.model.project_id == project_id,
                self.model.uuid == uuid,
            )
        )
        return query.first()

    def read_recents(
        self, db: Session, *, user_id: int, project_id: int, limit: int
    ) -> list[MemoORM]:
        """Return the user's most recently opened memos in a project, newest first."""
        return (
            db.query(MemoORM)
            .options(*self._load_options())
            .join(MemoRecentORM, MemoRecentORM.memo_id == MemoORM.id)
            .filter(
                MemoRecentORM.user_id == user_id,
                MemoORM.project_id == project_id,
            )
            .order_by(MemoRecentORM.last_opened.desc())
            .limit(limit)
            .all()
        )

    def read_favorite_ids(
        self, db: Session, *, memo_ids: list[int], user_id: int
    ) -> set[int]:
        """Return the ids of the given memos that the user favorited."""
        favorite_ids: set[int] = set()
        unique_ids = list(dict.fromkeys(memo_ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            favorite_ids.update(
                db.scalars(
                    select(MemoFavoriteLinkTable.memo_id).where(
                        MemoFavoriteLinkTable.memo_id.in_(batch_ids),
                        MemoFavoriteLinkTable.user_id == user_id,
                    )
                )
            )
        return favorite_ids

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

    ### LOADING ###

    def _load_options(self) -> list[ExecutableOption]:
        # the object handle tells the attached object of MemoRead
        return [selectinload(self.model.attached_to)]


crud_memo = CRUDMemo(MemoORM)
