from sqlalchemy.orm import Session

from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoInDB, MemoRead
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_orm import (
    ATTACHED_OBJECT_TYPE_TO_HANDLE_COLUMN,
    ObjectHandleORM,
)


def _get_attached_object(handle: ObjectHandleORM) -> tuple[int, AttachedObjectType]:
    """The id and type of the object a memo's handle refers to."""
    for attached_object_type, column in ATTACHED_OBJECT_TYPE_TO_HANDLE_COLUMN.items():
        object_id = getattr(handle, column)
        if object_id is not None:
            return object_id, attached_object_type
    raise NotImplementedError(f"ObjectHandle {handle.id} refers to no memo target")


def get_memo_read_dto_from_orm(
    db: Session, *, project_id: int, db_obj: MemoORM, user_id: int | None = None
) -> MemoRead:
    return get_memo_read_dtos_from_orms(
        db=db, project_id=project_id, db_objs=[db_obj], user_id=user_id
    )[0]


def get_memo_read_dtos_from_orms(
    db: Session, *, project_id: int, db_objs: list[MemoORM], user_id: int | None = None
) -> list[MemoRead]:
    """
    Build the Read DTOs of memos with a constant number of queries: the attached
    object comes from the memo's object handle (eager-loaded by crud_memo's reads),
    the favorites of the user are read in one batch.

    Args:
        project_id: The project of the memos.
        db_objs: The memos.
        user_id: The requesting user, whose favorites `is_favorite` shows. Without
            one, no memo is a favorite.

    Returns:
        The memos, in the order of `db_objs`.
    """
    favorite_ids = (
        crud_memo.read_favorite_ids(
            db=db,
            project_id=project_id,
            memo_ids=[db_obj.id for db_obj in db_objs],
            user_id=user_id,
        )
        if user_id is not None
        else set()
    )

    results: list[MemoRead] = []
    for db_obj in db_objs:
        attached_object_id, attached_object_type = _get_attached_object(
            db_obj.attached_to
        )
        memo_data = MemoInDB.model_validate(db_obj).model_dump(
            exclude={"attached_to_id", "is_favorite"}
        )
        results.append(
            MemoRead(
                **memo_data,
                is_favorite=db_obj.id in favorite_ids,
                attached_object_id=attached_object_id,
                attached_object_type=attached_object_type,
            )
        )
    return results
