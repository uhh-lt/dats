from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_, delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import set_committed_value
from sqlalchemy.sql.base import ExecutableOption

from core.memo.memo_dto import MemoCreateIntern, MemoUpdate
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_orm import MemoFavoriteLinkTable, MemoORM, MemoRecentORM
from core.memo.object_handle_dto import ObjectHandleCreate
from core.memo.object_handle_orm import (
    ATTACHED_OBJECT_TYPE_TO_HANDLE_COLUMN,
    ObjectHandleORM,
)
from repos.db.crud_base import BATCH_SIZE
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDMemo(ProjectCRUDBase[MemoORM, MemoCreateIntern, MemoUpdate]):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, project_id: int, create_dtos: list[MemoCreateIntern]
    ) -> list[MemoORM]:
        # a memo needs an object handle: use create_multi_for_attached_objects
        raise NotImplementedError()

    def create_for_attached_object(
        self,
        db: Session,
        *,
        project_id: int,
        attached_object_id: int,
        attached_object_type: AttachedObjectType,
        create_dto: MemoCreateIntern,
    ) -> MemoORM:
        return self.create_multi_for_attached_objects(
            db=db,
            project_id=project_id,
            attached_object_type=attached_object_type,
            attached_object_ids=[attached_object_id],
            create_dtos=[create_dto],
        )[0]

    def create_multi_for_attached_objects(
        self,
        db: Session,
        *,
        project_id: int,
        attached_object_type: AttachedObjectType,
        attached_object_ids: list[int],
        create_dtos: list[MemoCreateIntern],
    ) -> list[MemoORM]:
        """
        Create memos attached to objects of one type, with a constant number of
        queries: the missing object handles are created in one batch, the memos
        with one flush. An object of another project violates the composite foreign
        key of its object handle (409).

        Args:
            project_id: The project of the memos and their objects.
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
        handle_column = ATTACHED_OBJECT_TYPE_TO_HANDLE_COLUMN[attached_object_type]
        oh_db_objs = crud_object_handle.create_multi(
            db=db,
            project_id=project_id,
            create_dtos=[
                ObjectHandleCreate.model_validate({handle_column: attached_object_id})
                for attached_object_id in attached_object_ids
            ],
        )

        # 2) create the memos, linked to the object handles by their id; the loaded
        # handles are set as committed values, so that reading memo.attached_to
        # needs no query
        # noinspection PyArgumentList
        db_objs = [
            self.model(
                **jsonable_encoder(create_dto),
                project_id=project_id,
                attached_to_id=oh_db_obj.id,
            )
            for create_dto, oh_db_obj in zip(create_dtos, oh_db_objs)
        ]
        db.add_all(db_objs)
        db.flush()
        for db_obj, oh_db_obj in zip(db_objs, oh_db_objs):
            set_committed_value(db_obj, "attached_to", oh_db_obj)

        return db_objs

    ### READ OPERATIONS ###

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
        attached_object_type: AttachedObjectType | None = None,
        attached_object_id: int | None = None,
        user_id: int | None = None,
        opened_by_user_id: int | None = None,
        limit: int | None = None,
    ) -> list[MemoORM]:
        """
        Read the memos of a project, optionally filtered.

        Args:
            project_id: The project of the memos.
            attached_object_type: Only memos attached to an object of this type.
            attached_object_id: Only memos attached to the object with this id; needs
                `attached_object_type`.
            user_id: Only memos of this author.
            opened_by_user_id: Only memos this user opened, most recently opened
                first.
            limit: At most this many memos.

        Returns:
            The matching memos.
        """
        query = (
            db.query(self.model)
            .options(*self._load_options())
            .where(self.model.project_id == project_id)
        )
        if attached_object_type is not None:
            handle_column = getattr(
                ObjectHandleORM,
                ATTACHED_OBJECT_TYPE_TO_HANDLE_COLUMN[attached_object_type],
            )
            query = query.join(
                ObjectHandleORM,
                and_(
                    ObjectHandleORM.project_id == self.model.project_id,
                    ObjectHandleORM.id == self.model.attached_to_id,
                ),
            ).where(
                handle_column.is_not(None)
                if attached_object_id is None
                else handle_column == attached_object_id
            )
        elif attached_object_id is not None:
            raise ValueError("Filtering by attached_object_id needs its type.")
        if user_id is not None:
            query = query.where(self.model.user_id == user_id)
        if opened_by_user_id is not None:
            query = (
                query.join(
                    MemoRecentORM,
                    and_(
                        MemoRecentORM.project_id == self.model.project_id,
                        MemoRecentORM.memo_id == self.model.id,
                    ),
                )
                .where(MemoRecentORM.user_id == opened_by_user_id)
                .order_by(MemoRecentORM.last_opened.desc())
            )
        if limit is not None:
            query = query.limit(limit)
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

    def read_favorite_ids(
        self, db: Session, *, project_id: int, memo_ids: list[int], user_id: int
    ) -> set[int]:
        """Return the ids of the given memos of the project that the user favorited."""
        favorite_ids: set[int] = set()
        unique_ids = list(dict.fromkeys(memo_ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            favorite_ids.update(
                db.scalars(
                    select(MemoFavoriteLinkTable.memo_id).where(
                        MemoFavoriteLinkTable.project_id == project_id,
                        MemoFavoriteLinkTable.memo_id.in_(batch_ids),
                        MemoFavoriteLinkTable.user_id == user_id,
                    )
                )
            )
        return favorite_ids

    ### UPDATE OPERATIONS ###

    def update_recent(
        self, db: Session, *, project_id: int, memo_id: int, user_id: int
    ) -> None:
        """
        Upsert a (user, memo) recents row, bumping last_opened to now.

        Raises:
            NoSuchElementError: If the memo does not exist in the project.
        """
        self.exists(db=db, project_id=project_id, id=memo_id, raise_error=True)
        insert_stmt = insert(MemoRecentORM).values(
            memo_id=memo_id, user_id=user_id, project_id=project_id
        )
        upsert_stmt = insert_stmt.on_conflict_do_update(
            index_elements=["project_id", "user_id", "memo_id"],
            set_={"last_opened": insert_stmt.excluded.last_opened},
        )
        db.execute(upsert_stmt)
        db.flush()

    ### DELETE OPERATIONS ###
    # Inherited from ProjectCRUDBase

    ### OTHER OPERATIONS ###

    def favorite(
        self, db: Session, *, project_id: int, memo_id: int, user_id: int
    ) -> None:
        self.favorite_multi(
            db=db, project_id=project_id, memo_ids=[memo_id], user_id=user_id
        )

    def favorite_multi(
        self, db: Session, *, project_id: int, memo_ids: list[int], user_id: int
    ) -> None:
        """
        Favorite memos of the project for a user; already favorited memos are
        skipped. A memo of another project violates the composite foreign key (409).
        """
        if not memo_ids:
            return

        unique_ids = list(dict.fromkeys(memo_ids))
        insert_stmt = insert(MemoFavoriteLinkTable).on_conflict_do_nothing()
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            db.execute(
                insert_stmt,
                [
                    {"memo_id": memo_id, "user_id": user_id, "project_id": project_id}
                    for memo_id in batch_ids
                ],
            )
        db.flush()

    def unfavorite_multi(
        self, db: Session, *, project_id: int, memo_ids: list[int], user_id: int
    ) -> None:
        """Remove the favorite of a user from memos; memos without one are skipped."""
        if not memo_ids:
            return

        unique_ids = list(dict.fromkeys(memo_ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            db.execute(
                delete(MemoFavoriteLinkTable).where(
                    MemoFavoriteLinkTable.project_id == project_id,
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
