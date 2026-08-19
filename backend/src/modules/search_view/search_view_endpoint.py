from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.search_view.search_view_crud import crud_search_view
from modules.search_view.search_view_dto import (
    SearchEntityType,
    SearchViewCreate,
    SearchViewRead,
    SearchViewReorder,
    SearchViewUpdate,
    search_view_read_from_orm,
)

router = APIRouter(
    prefix="/searchView",
    dependencies=[Depends(get_current_user)],
    tags=["searchView"],
)


@router.post(
    "",
    response_model=SearchViewRead,
    summary="Creates a personal search view",
)
def create(
    *,
    db: Session = Depends(get_db_session),
    view: SearchViewCreate,
    authz_user: AuthzUser = Depends(),
) -> SearchViewRead:
    authz_user.assert_in_project(view.project_id)
    db_view = crud_search_view.create(
        db=db, create_dto=view, user_id=authz_user.user.id
    )
    return search_view_read_from_orm(db_view)


@router.get(
    "/project/{project_id}",
    response_model=list[SearchViewRead],
    summary="Returns the current user's search views of an entity type in a project",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    entity_type: SearchEntityType,
    authz_user: AuthzUser = Depends(),
) -> list[SearchViewRead]:
    authz_user.assert_in_project(project_id)
    db_views = crud_search_view.read_by_user_project_and_entity(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        entity_type=entity_type,
    )
    return [search_view_read_from_orm(db_view) for db_view in db_views]


@router.put(
    "/project/{project_id}/order",
    response_model=list[SearchViewRead],
    summary="Reorders the current user's search views of an entity type in a project",
)
def reorder(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    entity_type: SearchEntityType,
    view_order: SearchViewReorder,
    authz_user: AuthzUser = Depends(),
) -> list[SearchViewRead]:
    authz_user.assert_in_project(project_id)
    db_views = crud_search_view.reorder(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        entity_type=entity_type,
        ordered_view_ids=view_order.view_ids,
    )
    return [search_view_read_from_orm(db_view) for db_view in db_views]


@router.patch(
    "/{view_id}",
    response_model=SearchViewRead,
    summary="Updates a personal search view",
)
def update(
    *,
    db: Session = Depends(get_db_session),
    view_id: int,
    view_update: SearchViewUpdate,
    authz_user: AuthzUser = Depends(),
) -> SearchViewRead:
    view = crud_search_view.read(db=db, id=view_id)
    authz_user.assert_in_project(view.project_id)
    authz_user.assert_is_same_user(view.user_id)
    db_view = crud_search_view.update(db=db, id=view_id, update_dto=view_update)
    return search_view_read_from_orm(db_view)


@router.delete(
    "/{view_id}",
    response_model=SearchViewRead,
    summary="Deletes a personal search view",
)
def delete(
    *,
    db: Session = Depends(get_db_session),
    view_id: int,
    authz_user: AuthzUser = Depends(),
) -> SearchViewRead:
    view = crud_search_view.read(db=db, id=view_id)
    authz_user.assert_in_project(view.project_id)
    authz_user.assert_is_same_user(view.user_id)
    result = search_view_read_from_orm(view)
    crud_search_view.delete(db=db, id=view_id)
    return result
