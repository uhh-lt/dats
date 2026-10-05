from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud, attached_object_type_to_memo_crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import (
    AttachedObjectType,
    MemoCreate,
    MemoCreateIntern,
    MemoInDB,
    MemoRead,
    MemoUpdate,
    MemoUpdateBulk,
)
from core.memo.memo_generation_service import generate_memo_llm
from core.memo.memo_orm import MemoORM
from core.memo.memo_utils import get_object_memos
from repos.db.crud_base import NoSuchElementError
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/memo", dependencies=[Depends(get_current_user)], tags=["memo", "mcp"]
)


# --- create operations


@router.put(
    "",
    response_model=MemoRead,
    summary="Adds a Memo to the Attached Object with the given ID if it exists",
)
def create_memo(
    *,
    db: Session = Depends(get_db_session),
    attached_object_id: int,
    attached_object_type: AttachedObjectType,
    memo: MemoCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> MemoRead:
    crud = attached_object_type_to_memo_crud.get(attached_object_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    # get project id of the attached object
    try:
        attached_object = crud.value.read(db=db, id=attached_object_id)
    except NoSuchElementError:
        authz_user.deny_access("Attached object does not exist")
    proj_id = attached_object.get_project_id()
    if proj_id is None:
        raise ValueError("Attached object has no project")

    # check if user is authorized to add memo to the attached object
    authz_user.assert_in_project(project_id=proj_id)

    db_obj = crud_memo.create_for_attached_object(
        db=db,
        attached_object_id=attached_object_id,
        attached_object_type=attached_object_type,
        create_dto=MemoCreateIntern(
            **memo.model_dump(),
            user_id=authz_user.user.id,
            project_id=proj_id,
            uuid=str(uuid4()),
        ),
    )
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    result = MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=attached_object_id,
        attached_object_type=attached_object_type,
    )
    ws.emit_to_project(DATSEvent.MEMO_CREATED, result, project_id=proj_id)
    return result


# --- read operations


@router.get(
    "/recent",
    response_model=list[MemoRead],
    summary="Returns the current user's most recently opened Memos in the project",
)
def get_recent_memos(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    limit: int = 10,
    authz_user: AuthzUser = Depends(),
) -> list[MemoRead]:
    authz_user.assert_in_project(project_id=project_id)

    db_objs = crud_memo.read_recents(
        db=db, user_id=authz_user.user.id, project_id=project_id, limit=limit
    )
    return [
        crud_memo.get_memo_read_dto_from_orm(
            db=db, db_obj=db_obj, user_id=authz_user.user.id
        )
        for db_obj in db_objs
    ]


@router.get(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Returns the Memo with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    db_obj = crud_memo.read(db=db, id=memo_id)
    return crud_memo.get_memo_read_dto_from_orm(
        db=db, db_obj=db_obj, user_id=authz_user.user.id
    )


@router.get(
    "/attached_obj/{attached_obj_type}/to/{attached_obj_id}",
    response_model=list[MemoRead],
    summary="Returns all Memos attached to the object if it exists",
)
def get_memos_by_attached_object_id(
    *,
    db: Session = Depends(get_db_session),
    attached_obj_id: int,
    attached_obj_type: AttachedObjectType,
    authz_user: AuthzUser = Depends(),
) -> list[MemoRead]:
    crud = attached_object_type_to_memo_crud.get(attached_obj_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    # get project id of the attached object
    try:
        attached_object = crud.value.read(db=db, id=attached_obj_id)
    except NoSuchElementError:
        authz_user.deny_access("Attached object does not exist")
    proj_id = attached_object.get_project_id()
    if proj_id is None:
        raise ValueError("Attached object has no project")

    # check if user is authorized to get memo from the attached object
    authz_user.assert_in_project(project_id=proj_id)

    return get_object_memos(db_obj=attached_object, db=db, user_id=authz_user.user.id)


# --- update operations


@router.patch(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Updates the Memo with the given ID if it exists",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    memo: MemoUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)
    existing_memo = crud_memo.read(db=db, id=memo_id)

    db_obj = crud_memo.update(
        db=db, user_id=authz_user.user.id, id=memo_id, update_dto=memo
    )
    result = crud_memo.get_memo_read_dto_from_orm(
        db=db, db_obj=db_obj, user_id=authz_user.user.id
    )

    # shared field changes are visible project-wide (which already reaches the
    # requesting user); only send a user-scoped event when there are exclusively
    # favorite changes, so we never emit twice.
    if memo.shared_fields_set():
        ws.emit_to_project(
            DATSEvent.MEMO_UPDATED, result, project_id=existing_memo.project_id
        )
    elif memo.is_favorite is not None:
        ws.emit_to_user(DATSEvent.MEMO_UPDATED, result, user_id=authz_user.user.id)
    return result


@router.patch(
    "/bulk/update",
    response_model=list[MemoRead],
    summary="Updates Memos in Bulk",
)
def update_memos_bulk(
    *,
    db: Session = Depends(get_db_session),
    memos: list[MemoUpdateBulk],
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[MemoRead]:
    for memo in memos:
        authz_user.assert_in_same_project_as(Crud.MEMO, memo.memo_id)

    db_objs = crud_memo.update_bulk(
        db=db, user_id=authz_user.user.id, update_dtos=memos
    )
    results = [
        crud_memo.get_memo_read_dto_from_orm(
            db=db, db_obj=db_obj, user_id=authz_user.user.id
        )
        for db_obj in db_objs
    ]
    if not results:
        return results

    # shared field changes are visible project-wide (which already reaches the
    # requesting user); only send a user-scoped event when there are exclusively
    # favorite changes, so we never emit twice.
    has_shared_changes = any(m.shared_fields_set() for m in memos)
    if has_shared_changes:

        def to_dto(db_obj: MemoORM) -> MemoRead:
            return crud_memo.get_memo_read_dto_from_orm(
                db=db, db_obj=db_obj, user_id=authz_user.user.id
            )

        ws.emit_to_projects_grouped(
            DATSEvent.MEMO_UPDATED_BATCH,
            db_objs,
            to_dto=to_dto,
        )
    elif any(m.is_favorite is not None for m in memos):
        ws.emit_to_user(
            DATSEvent.MEMO_UPDATED_BATCH, results, user_id=authz_user.user.id
        )
    return results


@router.post(
    "/{memo_id}/recent",
    status_code=204,
    summary="Records that the current user opened the Memo with the given ID",
)
def record_recent_memo(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> None:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    crud_memo.record_recent(db=db, memo_id=memo_id, user_id=authz_user.user.id)


# --- delete operations


@router.delete(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Removes the Memo with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)
    memo = crud_memo.read(db=db, id=memo_id)
    memo_read = crud_memo.get_memo_read_dto_from_orm(
        db, memo, user_id=authz_user.user.id
    )
    crud_memo.delete(db=db, id=memo_id)

    ws.emit_to_project(DATSEvent.MEMO_DELETED, memo_read, project_id=memo.project_id)
    return memo_read


@router.delete(
    "/bulk/delete",
    response_model=list[MemoRead],
    summary="Deletes all Memos with the given IDs.",
)
def delete_memos_bulk(
    *,
    db: Session = Depends(get_db_session),
    memo_ids: list[int],
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[MemoRead]:
    authz_user.assert_in_same_project_as_many(Crud.MEMO, memo_ids)

    memos = crud_memo.read_by_ids(db, memo_ids)

    # Build the DTOs grouped by project BEFORE deleting: the attached object must
    # still exist. A bulk delete may span multiple projects, so emit one event per
    # project, each carrying only that project's memos.
    groups: dict[int, list] = {}
    for memo in memos:
        groups.setdefault(memo.project_id, []).append(memo)
    results_by_project = {
        project_id: [
            crud_memo.get_memo_read_dto_from_orm(
                db=db, db_obj=memo, user_id=authz_user.user.id
            )
            for memo in group
        ]
        for project_id, group in groups.items()
    }

    crud_memo.delete_bulk(db=db, ids=memo_ids)

    for project_id, group_results in results_by_project.items():
        ws.emit_to_project(
            DATSEvent.MEMO_DELETED_BATCH, group_results, project_id=project_id
        )

    results = [dto for group in results_by_project.values() for dto in group]
    return results


# --- other operations


@router.get(
    "/generate_suggestion/{attached_obj_type}/{attached_obj_id}",
    response_model=str,
    summary="Generates a 1–2 sentence memo suggestion using LLM based on the attached object",
)
def generate_memo_suggestion(
    *,
    db: Session = Depends(get_db_session),
    attached_obj_id: int,
    attached_obj_type: AttachedObjectType,
    model: str,
    authz_user: AuthzUser = Depends(),
) -> str:
    crud = attached_object_type_to_memo_crud.get(attached_obj_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    try:
        attached_object = crud.value.read(db=db, id=attached_obj_id)
    except NoSuchElementError:
        authz_user.deny_access("Attached object does not exist")
    proj_id = attached_object.get_project_id()
    if proj_id is None:
        raise ValueError("Attached object has no project")

    authz_user.assert_in_project(project_id=proj_id)

    return generate_memo_llm(attached_object, db, model=model)
