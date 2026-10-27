from uuid import uuid4

from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoCreateIntern, MemoRead, MemoUpdate, MemoUpdateBulk
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_utils import get_memo_read_dtos_from_orms
from core.memo.object_handle_crud import crud_object_handle


class MemoService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(MemoService, cls).__new__(cls)

    def create_multi_for_attached_objects(
        self,
        db: Session,
        *,
        attached_object_type: AttachedObjectType,
        attached_object_ids: list[int],
        create_dtos: list[MemoCreateIntern],
    ) -> list[MemoRead]:
        """
        Create memos attached to objects of one type in bulk (a constant number of
        queries, no matter how many memos).

        Args:
            attached_object_type: The type of the objects the memos are attached to.
            attached_object_ids: The object each memo is attached to, parallel to
                `create_dtos`. An object may get several memos.
            create_dtos: The memos to create, with their author (`user_id`).

        Returns:
            The created memos, in the order of `create_dtos`. No memo is a
            favorite yet.
        """
        db_objs = crud_memo.create_multi_for_attached_objects(
            db=db,
            attached_object_type=attached_object_type,
            attached_object_ids=attached_object_ids,
            create_dtos=create_dtos,
        )
        return get_memo_read_dtos_from_orms(db=db, db_objs=db_objs)

    def copy_to_attached_objects(
        self,
        db: Session,
        *,
        attached_object_type: AttachedObjectType,
        source_object_ids: list[int],
        target_object_ids: list[int],
    ) -> list[MemoRead]:
        """
        Copy all memos of objects onto other objects of the same type and project
        in bulk (e.g. the memos of an annotation that is copied). The copies get a
        new uuid but keep the title, icon, content and the original author.

        Args:
            attached_object_type: The type of the source and target objects.
            source_object_ids: The objects whose memos are copied, parallel to
                `target_object_ids`. A source may be copied onto several targets.
            target_object_ids: The objects the copies are attached to.

        Returns:
            The created copies: grouped by target in the order of
            `target_object_ids`, each source's memos in their creation order.
        """
        if len(source_object_ids) != len(target_object_ids):
            raise ValueError(
                f"Got {len(source_object_ids)} source objects for "
                f"{len(target_object_ids)} target objects."
            )

        # 1) find the memos of every source object
        memo_ids_by_source_id = crud_object_handle.read_memo_ids_by_objects(
            db=db,
            attached_object_type=attached_object_type,
            object_ids=list(dict.fromkeys(source_object_ids)),
        )
        memo_ids = [
            memo_id
            for source_memo_ids in memo_ids_by_source_id.values()
            for memo_id in source_memo_ids
        ]
        memo_by_id = {
            db_obj.id: db_obj for db_obj in crud_memo.read_by_ids(db=db, ids=memo_ids)
        }

        # 2) copy them onto the targets
        attached_object_ids: list[int] = []
        create_dtos: list[MemoCreateIntern] = []
        for source_object_id, target_object_id in zip(
            source_object_ids, target_object_ids
        ):
            for memo_id in sorted(memo_ids_by_source_id.get(source_object_id, [])):
                memo = memo_by_id[memo_id]
                attached_object_ids.append(target_object_id)
                create_dtos.append(
                    MemoCreateIntern(
                        project_id=memo.project_id,
                        uuid=str(uuid4()),
                        user_id=memo.user_id,
                        title=memo.title,
                        icon=memo.icon,
                        content=memo.content,
                        content_json=memo.content_json,
                    )
                )

        return self.create_multi_for_attached_objects(
            db=db,
            attached_object_type=attached_object_type,
            attached_object_ids=attached_object_ids,
            create_dtos=create_dtos,
        )

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
