from uuid import uuid4

from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_group_crud import crud_span_group
from core.auth.auth_exceptions import InvalidError
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import (
    MemoCreate,
    MemoCreateIntern,
    MemoRead,
    MemoUpdate,
    MemoUpdateBulk,
)
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_generation_service import MemoObject
from core.memo.memo_utils import get_memo_read_dtos_from_orms
from core.memo.object_handle_crud import crud_object_handle
from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from repos.db.sql_exceptions import NoSuchElementError


class MemoService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(MemoService, cls).__new__(cls)

    def read_attached_object(
        self,
        db: Session,
        *,
        project_id: int,
        attached_object_type: AttachedObjectType,
        attached_object_id: int,
    ) -> MemoObject:
        """
        The object of the project a memo is attached to.

        Raises:
            NoSuchElementError: If the object does not exist in the project.
        """
        match attached_object_type:
            case AttachedObjectType.project:
                self._assert_own_project(
                    project_id=project_id, attached_object_id=attached_object_id
                )
                return crud_project.read(db=db, id=project_id)
            case AttachedObjectType.source_document:
                crud = crud_sdoc
            case AttachedObjectType.tag:
                crud = crud_tag
            case AttachedObjectType.code:
                crud = crud_code
            case AttachedObjectType.span_annotation:
                crud = crud_span_anno
            case AttachedObjectType.sentence_annotation:
                crud = crud_sentence_anno
            case AttachedObjectType.bbox_annotation:
                crud = crud_bbox_anno
            case AttachedObjectType.span_group:
                crud = crud_span_group
        return crud.read(db=db, project_id=project_id, id=attached_object_id)

    def create(
        self, db: Session, *, project_id: int, user_id: int, create_dto: MemoCreate
    ) -> MemoRead:
        """
        Create a memo of the user attached to an object of the project. An object
        of another project violates the composite foreign key of its object handle
        (409); the project itself is the only project a memo can be attached to
        (404 otherwise).

        Args:
            project_id: The project of the memo and its object.
            user_id: The author.
            create_dto: The memo and the object it is attached to.

        Returns:
            The created memo.
        """
        if create_dto.attached_object_type is AttachedObjectType.project:
            self._assert_own_project(
                project_id=project_id,
                attached_object_id=create_dto.attached_object_id,
            )
        return self.create_multi_for_attached_objects(
            db=db,
            project_id=project_id,
            attached_object_type=create_dto.attached_object_type,
            attached_object_ids=[create_dto.attached_object_id],
            create_dtos=[
                MemoCreateIntern(
                    **create_dto.model_dump(
                        exclude={"attached_object_id", "attached_object_type"}
                    ),
                    user_id=user_id,
                    uuid=str(uuid4()),
                )
            ],
        )[0]

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        attached_object_type: AttachedObjectType | None,
        attached_object_id: int | None,
        author_id: int | None,
        recent: bool = False,
        limit: int | None = None,
    ) -> list[MemoRead]:
        """
        The memos of a project, optionally filtered. A filter id of another project
        matches nothing.

        Args:
            project_id: The project of the memos.
            user_id: The requesting user, whose favorite flags the result shows.
            attached_object_type: Only memos attached to an object of this type.
            attached_object_id: Only memos attached to the object with this id.
            author_id: Only memos of this author.
            recent: Only memos the requesting user opened, most recently opened
                first.
            limit: At most this many memos.

        Raises:
            InvalidError: If `attached_object_id` is given without its type.
        """
        if attached_object_id is not None and attached_object_type is None:
            raise InvalidError("attached_object_id needs attached_object_type")
        db_objs = crud_memo.read_by_project(
            db=db,
            project_id=project_id,
            attached_object_type=attached_object_type,
            attached_object_id=attached_object_id,
            user_id=author_id,
            opened_by_user_id=user_id if recent else None,
            limit=limit,
        )
        return get_memo_read_dtos_from_orms(
            db=db, project_id=project_id, db_objs=db_objs, user_id=user_id
        )

    def create_multi_for_attached_objects(
        self,
        db: Session,
        *,
        project_id: int,
        attached_object_type: AttachedObjectType,
        attached_object_ids: list[int],
        create_dtos: list[MemoCreateIntern],
    ) -> list[MemoRead]:
        """
        Create memos attached to objects of one type in bulk (a constant number of
        queries, no matter how many memos).

        Args:
            project_id: The project of the memos and their objects.
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
            project_id=project_id,
            attached_object_type=attached_object_type,
            attached_object_ids=attached_object_ids,
            create_dtos=create_dtos,
        )
        return get_memo_read_dtos_from_orms(
            db=db, project_id=project_id, db_objs=db_objs
        )

    def copy_to_attached_objects(
        self,
        db: Session,
        *,
        project_id: int,
        attached_object_type: AttachedObjectType,
        source_object_ids: list[int],
        target_object_ids: list[int],
    ) -> list[MemoRead]:
        """
        Copy all memos of objects onto other objects of the same type and project
        in bulk (e.g. the memos of an annotation that is copied). The copies get a
        new uuid but keep the title, icon, content and the original author.

        Args:
            project_id: The project of the source and target objects.
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
            project_id=project_id,
            attached_object_type=attached_object_type,
            object_ids=list(dict.fromkeys(source_object_ids)),
        )
        memo_ids = [
            memo_id
            for source_memo_ids in memo_ids_by_source_id.values()
            for memo_id in source_memo_ids
        ]
        memo_by_id = {
            db_obj.id: db_obj
            for db_obj in crud_memo.read_by_ids(
                db=db, project_id=project_id, ids=memo_ids
            )
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
            project_id=project_id,
            attached_object_type=attached_object_type,
            attached_object_ids=attached_object_ids,
            create_dtos=create_dtos,
        )

    def update(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        id: int,
        update_dto: MemoUpdate,
    ) -> MemoRead:
        """
        Update a memo's shared fields and/or the requesting user's favorite flag.

        Args:
            project_id: The project of the memo.
            user_id: The requesting user, whose favorite flag `is_favorite` sets.
            id: The memo to update.
            update_dto: The changes.

        Returns:
            The updated memo, as seen by the requesting user.
        """
        update_bulk_dto = MemoUpdateBulk.model_validate(
            {**update_dto.model_dump(exclude_unset=True), "memo_id": id}
        )
        return self.update_multi(
            db=db, project_id=project_id, user_id=user_id, update_dtos=[update_bulk_dto]
        )[0]

    def update_multi(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        update_dtos: list[MemoUpdateBulk],
    ) -> list[MemoRead]:
        """
        Update the shared fields and/or the requesting user's favorite flag of memos,
        each identified by its memo_id.

        Args:
            project_id: The project of the memos.
            user_id: The requesting user, whose favorite flags `is_favorite` sets.
            update_dtos: The changes. Must not repeat a memo that changes shared fields.

        Returns:
            The updated memos as seen by the requesting user, in the order of
            `update_dtos`.

        Raises:
            NoSuchElementError: If a memo does not exist in the project.
        """
        if not update_dtos:
            return []

        # 1) every memo must exist in the project (404), also for a favorite only
        memo_ids = [u.memo_id for u in update_dtos]
        crud_memo.read_by_ids(db=db, project_id=project_id, ids=memo_ids)

        # 2) is_favorite is per-user state (a link-table row), not a memo column
        crud_memo.favorite_multi(
            db=db,
            project_id=project_id,
            memo_ids=[u.memo_id for u in update_dtos if u.is_favorite is True],
            user_id=user_id,
        )
        crud_memo.unfavorite_multi(
            db=db,
            project_id=project_id,
            memo_ids=[u.memo_id for u in update_dtos if u.is_favorite is False],
            user_id=user_id,
        )

        # 3) only the shared (project-visible) fields go through the memo update. A
        # favorite-only update has no shared fields, so it is skipped: an empty
        # MemoUpdate must not be validated (its validator requires one field).
        shared_updates = [u for u in update_dtos if u.shared_fields_set()]
        crud_memo.update_multi(
            db=db,
            project_id=project_id,
            ids=[u.memo_id for u in shared_updates],
            update_dtos=[
                MemoUpdate.model_validate(u.model_dump(include=u.shared_fields_set()))
                for u in shared_updates
            ],
        )

        # 4) read all memos as seen by the requesting user
        return get_memo_read_dtos_from_orms(
            db=db,
            project_id=project_id,
            db_objs=crud_memo.read_by_ids(db=db, project_id=project_id, ids=memo_ids),
            user_id=user_id,
        )

    def delete_multi(
        self, db: Session, *, project_id: int, user_id: int, ids: list[int]
    ) -> list[MemoRead]:
        """
        Delete memos.

        Args:
            project_id: The project of the memos.
            user_id: The requesting user, whose favorite flags the result shows.
            ids: The memos to delete.

        Returns:
            The deleted memos as they were before the deletion, in the order of
            `ids`.

        Raises:
            NoSuchElementError: If a memo does not exist in the project.
        """
        # 1) snapshot the memos before they are deleted: the attached object must
        # still exist
        deleted = get_memo_read_dtos_from_orms(
            db=db,
            project_id=project_id,
            db_objs=crud_memo.read_by_ids(db=db, project_id=project_id, ids=ids),
            user_id=user_id,
        )

        # 2) delete them
        crud_memo.delete_multi(db=db, project_id=project_id, ids=ids)

        return deleted

    def _assert_own_project(self, *, project_id: int, attached_object_id: int) -> None:
        """A memo can only be attached to the project it belongs to."""
        if attached_object_id != project_id:
            raise NoSuchElementError(ProjectORM, id=attached_object_id)
