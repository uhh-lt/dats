from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.auth_exceptions import InvalidError
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectUserLinks
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import ProjectAddUser, UserRead
from systems.websocket_system.websocket_dependency import WebsocketEmitter

# the members of a project; GET also lists its virtual users
router = project_router("/members", tags=["members", "mcp"])


# --- create operations


@router.put(
    "",
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


# --- read operations


@router.get(
    "",
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


# --- delete operations


@router.delete(
    "/{user_id}",
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
