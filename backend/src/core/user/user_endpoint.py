from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session, skip_limit_params
from core.auth.authz_user import AuthzUser
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectUserLinks
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import (
    ProjectAddUser,
    PublicUserRead,
    UserRead,
    UserUpdate,
    VirtualUserCreate,
    VirtualUserUpdate,
)
from core.user.user_orm import UserORM
from core.user.user_service import UserService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/user", dependencies=[Depends(get_current_user)], tags=["user", "mcp"]
)


# --- create operations


@router.put(
    "/{project_id}/virtual_user",
    response_model=UserRead,
    summary="Creates a virtual user (a user without login) in the Project",
)
def create_virtual_user(
    *,
    project_id: int,
    virtual_user: VirtualUserCreate,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    authz_user.assert_in_project(project_id)

    result = UserService().create_virtual_user(
        db=db, project_id=project_id, name=virtual_user.name
    )
    ws.emit_to_project(DATSEvent.USER_CREATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "/me",
    response_model=UserRead,
    summary="Returns the current (logged in) user",
)
def get_me(*, user: UserORM = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)


@router.get(
    "/by_id/{user_id}",
    response_model=PublicUserRead,
    summary="Returns the User with the given ID if it exists",
)
def get_by_id(*, db: Session = Depends(get_db_session), user_id: int) -> PublicUserRead:
    db_user = crud_user.read(db=db, id=user_id)
    return PublicUserRead.model_validate(db_user)


@router.get(
    "/{project_id}/user",
    response_model=list[UserRead],
    summary=(
        "Returns all Users of the Project with the given ID: its members, then its "
        "virtual users"
    ),
)
def get_by_project(
    *,
    project_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[UserRead]:
    authz_user.assert_in_project(project_id)

    return [
        UserRead.model_validate(user)
        for user in crud_user.read_by_project(db=db, project_id=project_id)
    ]


@router.get(
    "/all",
    response_model=list[PublicUserRead],
    summary="Returns all Users that exist in the system, without virtual users",
)
def get_all(
    *,
    db: Session = Depends(get_db_session),
    skip_limit: dict[str, int] = Depends(skip_limit_params),
) -> list[PublicUserRead]:
    db_objs = crud_user.read_multi(db=db, include_virtual=False, **skip_limit)
    return [PublicUserRead.model_validate(proj) for proj in db_objs]


# --- update operations


@router.patch(
    "/",
    response_model=UserRead,
    summary="Updates the logged-in User",
)
def update_me(
    *,
    db: Session = Depends(get_db_session),
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


@router.patch(
    "/virtual_user/{user_id}",
    response_model=UserRead,
    summary="Renames the virtual user with the given ID",
)
def update_virtual_user(
    *,
    user_id: int,
    virtual_user: VirtualUserUpdate,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    authz_user.assert_in_same_project_as(Crud.USER, user_id)

    result = UserService().update_virtual_user(
        db=db, user_id=user_id, update_dto=virtual_user
    )
    assert result.project_id is not None
    ws.emit_to_project(DATSEvent.USER_UPDATED, result, project_id=result.project_id)
    return result


@router.patch(
    "/{project_id}/user",
    response_model=ProjectUserLinks,
    summary="Associates an existing User to the Project with the given ID if it exists",
)
def associate_user_to_project(
    *,
    project_id: int,
    user: ProjectAddUser,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ProjectUserLinks:
    authz_user.assert_in_project(project_id)

    user_db_obj = crud_user.read_by_email(db=db, email=user.email)
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
    "/",
    response_model=UserRead,
    summary="Removes the logged-in User",
)
def delete_me(
    *,
    db: Session = Depends(get_db_session),
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


@router.delete(
    "/virtual_user/{user_id}",
    response_model=UserRead,
    summary=(
        "Removes the virtual user with the given ID together with all its "
        "annotations and memos"
    ),
)
def delete_virtual_user(
    *,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    authz_user.assert_in_same_project_as(Crud.USER, user_id)

    result = UserService().delete_virtual_user(db=db, user_id=user_id)
    assert result.project_id is not None
    ws.emit_to_project(DATSEvent.USER_DELETED, result, project_id=result.project_id)
    return result


@router.delete(
    "/{project_id}/user/{user_id}",
    response_model=ProjectUserLinks,
    summary="Dissociates the Users with the Project with the given ID if it exists",
)
def dissociate_user_from_project(
    *,
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ProjectUserLinks:
    authz_user.assert_in_project(project_id)

    crud_project.dissociate_user(db=db, project_id=project_id, user_id=user_id)
    result = ProjectUserLinks(
        project_id=project_id,
        users=[
            UserRead.model_validate(u)
            for u in crud_user.read_by_project(db=db, project_id=project_id)
        ],
    )
    ws.emit_to_project(DATSEvent.PROJECT_USERS_LINKED, result, project_id=project_id)
    return result
