from fastapi import Depends, Query

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import (
    MemoCreate,
    MemoRead,
    MemoSuggestionRequest,
    MemoUpdate,
    MemoUpdateBulk,
)
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_generation_service import MemoGenerationService
from core.memo.memo_service import MemoService
from core.memo.memo_utils import (
    get_memo_read_dto_from_orm,
)
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/memos", tags=["memos", "mcp"])


# --- create operations


@router.put(
    "",
    response_model=MemoRead,
    summary="Creates a Memo attached to the given object and returns it.",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    memo: MemoCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> MemoRead:
    result = MemoService().create(
        db=db, project_id=project_id, user_id=authz_user.user.id, create_dto=memo
    )
    ws.emit_to_project(DATSEvent.MEMO_CREATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "",
    response_model=list[MemoRead],
    summary="Returns the Memos of the Project, optionally filtered by the attached object (attached_object_id needs attached_object_type), the author (user_id) and the memos the current user opened, most recently opened first (recent), at most limit.",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
    attached_object_type: AttachedObjectType | None = None,
    attached_object_id: int | None = None,
    user_id: int | None = None,
    recent: bool = False,
    limit: int | None = Query(default=None, ge=1),
    authz_user: AuthzUser = Depends(),
) -> list[MemoRead]:
    return MemoService().read_by_project(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        attached_object_type=attached_object_type,
        attached_object_id=attached_object_id,
        author_id=user_id,
        recent=recent,
        limit=limit,
    )


@router.get(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Returns the Memo with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    db_obj = crud_memo.read(db=db, project_id=project_id, id=memo_id)
    return get_memo_read_dto_from_orm(
        db=db, project_id=project_id, db_obj=db_obj, user_id=authz_user.user.id
    )


# --- update operations


@router.patch(
    "/bulk",
    response_model=list[MemoRead],
    summary="Updates the Memos with the given IDs.",
)
def update_bulk(
    *,
    db: DBSession,
    project_id: int,
    memos: list[MemoUpdateBulk],
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[MemoRead]:
    results = MemoService().update_multi(
        db=db, project_id=project_id, user_id=authz_user.user.id, update_dtos=memos
    )
    if not results:
        return results

    # shared field changes are visible project-wide (which already reaches the
    # requesting user); only send a user-scoped event when there are exclusively
    # favorite changes, so we never emit twice.
    if any(m.shared_fields_set() for m in memos):
        ws.emit_to_project(DATSEvent.MEMO_UPDATED_BATCH, results, project_id=project_id)
    elif any(m.is_favorite is not None for m in memos):
        ws.emit_to_user(
            DATSEvent.MEMO_UPDATED_BATCH, results, user_id=authz_user.user.id
        )
    return results


@router.patch(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Updates the Memo with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    memo_id: int,
    memo: MemoUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> MemoRead:
    result = MemoService().update(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        id=memo_id,
        update_dto=memo,
    )

    # shared field changes are visible project-wide (which already reaches the
    # requesting user); only send a user-scoped event when there are exclusively
    # favorite changes, so we never emit twice.
    if memo.shared_fields_set():
        ws.emit_to_project(DATSEvent.MEMO_UPDATED, result, project_id=project_id)
    elif memo.is_favorite is not None:
        ws.emit_to_user(DATSEvent.MEMO_UPDATED, result, user_id=authz_user.user.id)
    return result


@router.patch(
    "/{memo_id}/mark-recent",
    response_model=MemoRead,
    summary="Records that the current user opened the Memo with the given ID and returns the Memo",
)
def mark_recent(
    *,
    db: DBSession,
    project_id: int,
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    crud_memo.update_recent(
        db=db, project_id=project_id, memo_id=memo_id, user_id=authz_user.user.id
    )
    db_obj = crud_memo.read(db=db, project_id=project_id, id=memo_id)
    return get_memo_read_dto_from_orm(
        db=db, project_id=project_id, db_obj=db_obj, user_id=authz_user.user.id
    )


# --- delete operations


@router.delete(
    "/bulk",
    response_model=list[MemoRead],
    summary="Deletes the Memos with the given IDs.",
)
def delete_bulk(
    *,
    db: DBSession,
    project_id: int,
    memo_ids: list[int],
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[MemoRead]:
    results = MemoService().delete_multi(
        db=db, project_id=project_id, user_id=authz_user.user.id, ids=memo_ids
    )
    if results:
        ws.emit_to_project(DATSEvent.MEMO_DELETED_BATCH, results, project_id=project_id)
    return results


@router.delete(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Deletes the Memo with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    memo_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> MemoRead:
    result = MemoService().delete_multi(
        db=db, project_id=project_id, user_id=authz_user.user.id, ids=[memo_id]
    )[0]
    ws.emit_to_project(DATSEvent.MEMO_DELETED, result, project_id=project_id)
    return result


# --- other operations


@router.post(
    "/suggestion",
    response_model=str,
    summary="Generates a 1–2 sentence memo suggestion using LLM based on the attached object",
)
def compute_suggestion(
    *,
    db: DBSession,
    project_id: int,
    request: MemoSuggestionRequest,
) -> str:
    attached_object = MemoService().read_attached_object(
        db=db,
        project_id=project_id,
        attached_object_type=request.attached_object_type,
        attached_object_id=request.attached_object_id,
    )
    return MemoGenerationService().generate_memo_suggestion(
        db=db, obj=attached_object, model=request.model
    )
