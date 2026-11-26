from fastapi import APIRouter, Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession, get_current_user
from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from core.project.project_crud import crud_project
from core.project.project_dto import (
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
)
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from systems.websocket_system.websocket_dependency import WebsocketEmitter

# creating projects and the projects of the logged-in user, outside every project
router = APIRouter(dependencies=[Depends(get_current_user)], tags=["project", "mcp"])
# the project itself
project = project_router("", tags=[])
router.include_router(project)


# --- create operations


@router.put(
    "/projects",
    response_model=ProjectRead,
    summary="Creates a new Project",
)
def create_project(
    *,
    db: DBSession,
    proj: ProjectCreate,
    current_user: UserORM = Depends(get_current_user),
    ws: WebsocketEmitter = Depends(),
) -> ProjectRead:
    result = ProjectService().create_project(
        db=db, create_dto=proj, creating_user_id=current_user.id
    )
    ws.emit_to_user(DATSEvent.PROJECT_CREATED, result, user_id=current_user.id)
    return result


# --- read operations


@project.get(
    "",
    response_model=ProjectRead,
    summary="Returns the Project with the given ID if it exists",
)
def get_project(*, db: DBSession, project_id: int) -> ProjectRead:
    db_obj = crud_project.read(db=db, id=project_id)
    return ProjectRead.model_validate(db_obj)


@router.get(
    "/users/me/projects",
    response_model=list[ProjectRead],
    summary="Returns all Projects of the logged-in User",
)
def get_user_projects(
    *,
    db: DBSession,
    authz_user: AuthzUser = Depends(),
) -> list[ProjectRead]:
    db_obj = crud_user.read(db=db, id=authz_user.user.id)
    return [ProjectRead.model_validate(proj) for proj in db_obj.projects]


# --- update operations


@project.patch(
    "",
    response_model=ProjectRead,
    summary="Updates the Project with the given ID.",
)
def update_project(
    *,
    db: DBSession,
    project_id: int,
    proj: ProjectUpdate,
    ws: WebsocketEmitter = Depends(),
) -> ProjectRead:
    # title and description only: the enabled features change only through
    # FeatureService (the /projects/{project_id}/features/... endpoints)
    db_obj = crud_project.update(db=db, id=project_id, update_dto=proj)
    result = ProjectRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.PROJECT_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@project.delete(
    "",
    response_model=ProjectRead,
    summary="Removes the Project with the given ID.",
)
def delete_project(
    *,
    db: DBSession,
    project_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ProjectRead:
    # Capture the member ids and payload BEFORE deletion: the delete cascades the
    # membership rows, so the post-commit background task cannot re-read them.
    member_ids = [user.id for user in crud_project.read(db=db, id=project_id).users]
    result = ProjectService().delete_project(db=db, project_id=project_id)
    ws.emit_to_users(DATSEvent.PROJECT_DELETED, result, user_ids=member_ids)
    return result
