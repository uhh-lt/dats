from fastapi import APIRouter, Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession, get_current_user
from common.project_router import project_router
from core.auth.auth_exceptions import InvalidError
from core.auth.authz_user import AuthzUser
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectUserLinks
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import (
    ProjectAddUser,
    UserRead,
    UserUpdate,
    VirtualUserCreate,
)
from core.user.user_orm import UserORM
from systems.websocket_system.websocket_dependency import WebsocketEmitter

# the logged-in user, outside every project
router = APIRouter(dependencies=[Depends(get_current_user)], tags=["user", "mcp"])
# the users of a project: its members and its virtual users
project = project_router("", tags=[])
router.include_router(project)


# --- create operations


@project.put(
    "/virtual-users",
    response_model=UserRead,
    summary="Creates a virtual user (a user that cannot log in) in the Project",
)
def create_virtual_user(
    *,
    project_id: int,
    virtual_user: VirtualUserCreate,
    db: DBSession,
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    db_user = crud_user.create_virtual_user(
        db=db, project_id=project_id, name=virtual_user.name
    )
    result = UserRead.model_validate(db_user)
    ws.emit_to_project(DATSEvent.USER_CREATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "/users/me",
    response_model=UserRead,
    summary="Returns the current (logged in) user",
)
def get_me(*, user: UserORM = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)


@project.get(
    "/members",
    response_model=list[UserRead],
    summary=(
        "Returns all Users of the Project with the given ID: its members, then its "
        "virtual users"
    ),
)
def get_by_project(*, project_id: int, db: DBSession) -> list[UserRead]:
    return [
        UserRead.model_validate(user)
        for user in crud_user.read_by_project(db=db, project_id=project_id)
    ]


# --- update operations


@router.patch(
    "/users/me",
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


@project.patch(
    "/virtual-users/{user_id}",
    response_model=UserRead,
    summary="Updates the virtual user with the given ID of the Project",
)
def update_by_id(
    *,
    project_id: int,
    user_id: int,
    user: UserUpdate,
    db: DBSession,
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    crud_user.read_virtual_user(db=db, project_id=project_id, id=user_id)
    # the email and password of a virtual user are generated, never chosen
    if user.email is not None or user.password is not None:
        raise InvalidError("The email and password of a virtual user cannot be changed")

    result = UserRead.model_validate(
        crud_user.update(db=db, id=user_id, update_dto=user)
    )
    ws.emit_to_project(DATSEvent.USER_UPDATED, result, project_id=project_id)
    return result


@project.put(
    "/members",
    response_model=ProjectUserLinks,
    summary="Adds the existing User with the given email to the Project as a member",
)
def associate_user_to_project(
    *,
    project_id: int,
    user: ProjectAddUser,
    db: DBSession,
    ws: WebsocketEmitter = Depends(),
) -> ProjectUserLinks:
    user_db_obj = crud_user.read_by_email(db=db, email=user.email)
    # virtual users belong to their project without being members
    if user_db_obj.is_virtual:
        raise InvalidError("Virtual users cannot become project members")
    ProjectService().associate_user(
        db=db, project_id=project_id, user_id=user_db_obj.id
    )
    result = ProjectUserLinks(
        project_id=project_id,
        users=[
            UserRead.model_validate(u)
            for u in crud_user.read_by_project(db=db, project_id=project_id)
        ],
    )
    ws.emit_to_project(DATSEvent.PROJECT_USERS_LINKED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/users/me",
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


@project.delete(
    "/virtual-users/{user_id}",
    response_model=UserRead,
    summary=(
        "Removes the virtual user with the given ID of the Project together with all "
        "its annotations and memos. The virtual user of an experiment run cannot be "
        "deleted here (HTTP 409); delete its run in the Experiment Studio."
    ),
)
def delete_by_id(
    *,
    project_id: int,
    user_id: int,
    db: DBSession,
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    result = UserRead.model_validate(
        crud_user.read_virtual_user(db=db, project_id=project_id, id=user_id)
    )
    crud_user.delete(db=db, id=user_id)
    ws.emit_to_project(DATSEvent.USER_DELETED, result, project_id=project_id)
    return result


@project.delete(
    "/members/{user_id}",
    response_model=ProjectUserLinks,
    summary="Removes the member with the given ID from the Project",
)
def dissociate_user_from_project(
    *,
    project_id: int,
    user_id: int,
    db: DBSession,
    ws: WebsocketEmitter = Depends(),
) -> ProjectUserLinks:
    # the members before the removal: the removed user gets the event too
    member_ids = [u.id for u in crud_user.read_by_project(db=db, project_id=project_id)]
    crud_project.dissociate_user(db=db, project_id=project_id, user_id=user_id)
    result = ProjectUserLinks(
        project_id=project_id,
        users=[
            UserRead.model_validate(u)
            for u in crud_user.read_by_project(db=db, project_id=project_id)
        ],
    )
    ws.emit_to_users(DATSEvent.PROJECT_USERS_LINKED, result, user_ids=member_ids)
    return result
