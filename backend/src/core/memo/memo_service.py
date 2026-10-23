from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoRead, MemoUpdate, MemoUpdateBulk
from core.memo.memo_utils import get_memo_read_dtos_from_orms


class MemoService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(MemoService, cls).__new__(cls)

    def update(
        self, db: Session, *, user_id: int, id: int, update_dto: MemoUpdate
    ) -> MemoRead:
        """
        Update a memo's shared fields and/or the requesting user's favorite flag.

        Args:
            user_id: The requesting user, whose favorite flag `is_favorite` sets.
            id: The memo to update.
            update_dto: The changes.

        Returns:
            The updated memo, as seen by the requesting user.
        """
        update_bulk_dto = MemoUpdateBulk.model_validate(
            {**update_dto.model_dump(exclude_unset=True), "memo_id": id}
        )
        return self.update_multi(db=db, user_id=user_id, update_dtos=[update_bulk_dto])[
            0
        ]

    def update_multi(
        self, db: Session, *, user_id: int, update_dtos: list[MemoUpdateBulk]
    ) -> list[MemoRead]:
        """
        Update the shared fields and/or the requesting user's favorite flag of memos,
        each identified by its memo_id.

        Args:
            user_id: The requesting user, whose favorite flags `is_favorite` sets.
            update_dtos: The changes. Must not repeat a memo that changes shared fields.

        Returns:
            The updated memos as seen by the requesting user, in the order of
            `update_dtos`.
        """
        if not update_dtos:
            return []

        # 1) is_favorite is per-user state (a link-table row), not a memo column
        crud_memo.favorite_multi(
            db=db,
            memo_ids=[u.memo_id for u in update_dtos if u.is_favorite is True],
            user_id=user_id,
        )
        crud_memo.unfavorite_multi(
            db=db,
            memo_ids=[u.memo_id for u in update_dtos if u.is_favorite is False],
            user_id=user_id,
        )

        # 2) only the shared (project-visible) fields go through the memo update. A
        # favorite-only update has no shared fields, so it is skipped: an empty
        # MemoUpdate must not be validated (its validator requires one field).
        shared_updates = [u for u in update_dtos if u.shared_fields_set()]
        crud_memo.update_multi(
            db=db,
            ids=[u.memo_id for u in shared_updates],
            update_dtos=[
                MemoUpdate.model_validate(u.model_dump(include=u.shared_fields_set()))
                for u in shared_updates
            ],
        )

        # 3) read all memos as seen by the requesting user
        return get_memo_read_dtos_from_orms(
            db=db,
            db_objs=crud_memo.read_by_ids(db=db, ids=[u.memo_id for u in update_dtos]),
            user_id=user_id,
        )

    def delete_multi(
        self, db: Session, *, user_id: int, ids: list[int]
    ) -> list[MemoRead]:
        """
        Delete memos.

        Args:
            user_id: The requesting user, whose favorite flags the result shows.
            ids: The memos to delete.

        Returns:
            The deleted memos as they were before the deletion, in the order of
            `ids`.
        """
        # 1) snapshot the memos before they are deleted: the attached object must
        # still exist
        deleted = get_memo_read_dtos_from_orms(
            db=db, db_objs=crud_memo.read_by_ids(db=db, ids=ids), user_id=user_id
        )

        # 2) delete them
        crud_memo.delete_multi(db=db, ids=ids)

        return deleted
