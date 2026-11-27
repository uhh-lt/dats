from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from modules.search_view.search_view_crud import crud_search_view
from modules.search_view.search_view_dto import (
    SearchViewCreateUnion,
    SearchViewReadUnion,
    SearchViewReorder,
    SearchViewUpdateUnion,
    search_view_read_from_orm,
)
from modules.search_view.search_view_enum import SearchEntityType
from modules.search_view.search_view_service import SearchViewService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/search-views", tags=["searchView"])


# --- create operations


@router.put(
    "",
    response_model=SearchViewReadUnion,
    summary="Creates a personal search view",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    view: SearchViewCreateUnion,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SearchViewReadUnion:
    result = SearchViewService().create(
        db=db, project_id=project_id, user_id=authz_user.user.id, create_dto=view
    )
    ws.emit_to_user(DATSEvent.SEARCH_VIEW_CREATED, result, user_id=result.user_id)
    return result


# --- read operations


@router.get(
    "",
    response_model=list[SearchViewReadUnion],
    summary="Returns the current user's search views of an entity type in a project",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
    entity_type: SearchEntityType,
    authz_user: AuthzUser = Depends(),
) -> list[SearchViewReadUnion]:
    db_views = crud_search_view.read_by_user_project_and_entity(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        entity_type=entity_type,
    )
    return [search_view_read_from_orm(db_view) for db_view in db_views]


# --- update operations


@router.patch(
    "/reorder",
    response_model=list[SearchViewReadUnion],
    summary="Reorders the current user's search views of an entity type in a project",
)
def reorder(
    *,
    db: DBSession,
    project_id: int,
    view_order: SearchViewReorder,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SearchViewReadUnion]:
    db_views = crud_search_view.reorder(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        entity_type=view_order.entity_type,
        ordered_view_ids=view_order.view_ids,
    )
    result = [search_view_read_from_orm(db_view) for db_view in db_views]
    ws.emit_to_user(
        DATSEvent.SEARCH_VIEW_UPDATED_BATCH, result, user_id=authz_user.user.id
    )
    return result


@router.patch(
    "/{search_view_id}",
    response_model=SearchViewReadUnion,
    summary="Updates a personal search view",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    search_view_id: int,
    view_update: SearchViewUpdateUnion,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SearchViewReadUnion:
    view = crud_search_view.read(db=db, project_id=project_id, id=search_view_id)
    authz_user.assert_is_same_user(view.user_id)
    db_view = crud_search_view.update(
        db=db, project_id=project_id, id=search_view_id, update_dto=view_update
    )
    result = search_view_read_from_orm(db_view)
    ws.emit_to_user(DATSEvent.SEARCH_VIEW_UPDATED, result, user_id=result.user_id)
    return result


# --- delete operations


@router.delete(
    "/{search_view_id}",
    response_model=SearchViewReadUnion,
    summary="Deletes a personal search view",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    search_view_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SearchViewReadUnion:
    view = crud_search_view.read(db=db, project_id=project_id, id=search_view_id)
    authz_user.assert_is_same_user(view.user_id)
    result = search_view_read_from_orm(view)
    crud_search_view.delete(db=db, project_id=project_id, id=search_view_id)
    ws.emit_to_user(DATSEvent.SEARCH_VIEW_DELETED, result, user_id=result.user_id)
    return result
