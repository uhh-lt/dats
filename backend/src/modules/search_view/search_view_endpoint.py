from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.search_view.search_view_crud import crud_search_view
from modules.search_view.search_view_dto import (
    SearchEntityType,
    SearchViewCreateUnion,
    SearchViewReadUnion,
    SearchViewReorder,
    SearchViewUpdateUnion,
    search_view_read_from_orm,
)
from repos.db.crud_base import NoSuchElementError
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/searchView",
    dependencies=[Depends(get_current_user)],
    tags=["searchView"],
)


# --- create operations


@router.put(
    "",
    response_model=SearchViewReadUnion,
    summary="Creates a personal search view",
)
def create(
    *,
    db: Session = Depends(get_db_session),
    view: SearchViewCreateUnion,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SearchViewReadUnion:
    authz_user.assert_in_project(view.project_id)
    db_view = crud_search_view.create(
        db=db, create_dto=view, user_id=authz_user.user.id
    )
    result = search_view_read_from_orm(db_view)
    ws.emit_to_user(DATSEvent.SEARCH_VIEW_CREATED, result, user_id=result.user_id)
    return result


# --- read operations


@router.get(
    "/project/{project_id}",
    response_model=list[SearchViewReadUnion],
    summary="Returns the current user's search views of an entity type in a project",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    entity_type: SearchEntityType,
    authz_user: AuthzUser = Depends(),
) -> list[SearchViewReadUnion]:
    authz_user.assert_in_project(project_id)
    db_views = crud_search_view.read_by_user_project_and_entity(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        entity_type=entity_type,
    )
    return [search_view_read_from_orm(db_view) for db_view in db_views]


# --- update operations


@router.patch(
    "/project/{project_id}/order",
    response_model=list[SearchViewReadUnion],
    summary="Reorders the current user's search views of an entity type in a project",
)
def reorder(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    entity_type: SearchEntityType,
    view_order: SearchViewReorder,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SearchViewReadUnion]:
    authz_user.assert_in_project(project_id)
    db_views = crud_search_view.reorder(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        entity_type=entity_type,
        ordered_view_ids=view_order.view_ids,
    )
    result = [search_view_read_from_orm(db_view) for db_view in db_views]
    ws.emit_to_user(
        DATSEvent.SEARCH_VIEW_UPDATED_BATCH, result, user_id=authz_user.user.id
    )
    return result


@router.patch(
    "/{view_id}",
    response_model=SearchViewReadUnion,
    summary="Updates a personal search view",
)
def update(
    *,
    db: Session = Depends(get_db_session),
    view_id: int,
    view_update: SearchViewUpdateUnion,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SearchViewReadUnion:
    try:
        view = crud_search_view.read(db=db, id=view_id)
    except NoSuchElementError:
        authz_user.deny_access("Search view does not exist")
    authz_user.assert_in_project(view.project_id)
    authz_user.assert_is_same_user(view.user_id)
    db_view = crud_search_view.update(db=db, id=view_id, update_dto=view_update)
    result = search_view_read_from_orm(db_view)
    ws.emit_to_user(DATSEvent.SEARCH_VIEW_UPDATED, result, user_id=result.user_id)
    return result


# --- delete operations


@router.delete(
    "/{view_id}",
    response_model=SearchViewReadUnion,
    summary="Deletes a personal search view",
)
def delete(
    *,
    db: Session = Depends(get_db_session),
    view_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SearchViewReadUnion:
    try:
        view = crud_search_view.read(db=db, id=view_id)
    except NoSuchElementError:
        authz_user.deny_access("Search view does not exist")
    authz_user.assert_in_project(view.project_id)
    authz_user.assert_is_same_user(view.user_id)
    result = search_view_read_from_orm(view)
    crud_search_view.delete(db=db, id=view_id)
    ws.emit_to_user(DATSEvent.SEARCH_VIEW_DELETED, result, user_id=result.user_id)
    return result
