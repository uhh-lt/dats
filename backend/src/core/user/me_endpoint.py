from fastapi import APIRouter, Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession, get_current_user
from core.auth.authz_user import AuthzUser
from core.project.project_dto import ProjectRead
from core.user.user_crud import crud_user
from core.user.user_dto import UserRead, UserUpdate
from core.user.user_orm import UserORM
from systems.websocket_system.websocket_dependency import WebsocketEmitter

# the logged-in user, outside every project
router = APIRouter(
    prefix="/users/me", dependencies=[Depends(get_current_user)], tags=["user", "mcp"]
)


# --- read operations


@router.get(
    "",
    response_model=UserRead,
    summary="Returns the current (logged in) user",
)
def get_me(*, user: UserORM = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)


@router.get(
    "/projects",
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


@router.patch(
    "",
    response_model=UserRead,
    summary="Updates the logged-in User",
)
def update_me(
    *,
    db: DBSession,
    user: UserUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    db_user = crud_user.update(db=db, id=authz_user.user.id, update_dto=user)
    result = UserRead.model_validate(db_user)
    # Notify all collaborators across every project the user belongs to
    member_ids = {member.id for project in db_user.projects for member in project.users}
    ws.emit_to_users(DATSEvent.USER_UPDATED, result, user_ids=list(member_ids))
    return result


# --- delete operations


@router.delete(
    "",
    response_model=UserRead,
    summary="Removes the logged-in User",
)
def delete_me(
    *,
    db: DBSession,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    # Capture collaborators BEFORE deletion: deleting the user cascades the
    # membership rows, so they cannot be re-read afterwards.
    member_ids = {
        member.id
        for project in crud_user.read(db=db, id=authz_user.user.id).projects
        for member in project.users
    }
    db_user = crud_user.delete(db=db, id=authz_user.user.id)
    result = UserRead.model_validate(db_user)
    ws.emit_to_users(DATSEvent.USER_DELETED, result, user_ids=list(member_ids))
    return result
