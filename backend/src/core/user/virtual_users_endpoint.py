from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.auth_exceptions import InvalidError
from core.user.user_crud import crud_user
from core.user.user_dto import UserRead, UserUpdate, VirtualUserCreate
from systems.websocket_system.websocket_dependency import WebsocketEmitter

# the virtual users of a project: users that cannot log in
router = project_router("/virtual-users", tags=["virtualUsers", "mcp"])


# --- create operations


@router.put(
    "",
    response_model=UserRead,
    summary="Creates a virtual user (a user that cannot log in) in the Project",
)
def create(
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


# --- update operations


@router.patch(
    "/{virtual_user_id}",
    response_model=UserRead,
    summary="Updates the virtual user with the given ID of the Project",
)
def update_by_id(
    *,
    project_id: int,
    virtual_user_id: int,
    user: UserUpdate,
    db: DBSession,
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    crud_user.read_virtual_user(db=db, project_id=project_id, id=virtual_user_id)
    # the email and password of a virtual user are generated, never chosen
    if user.email is not None or user.password is not None:
        raise InvalidError("The email and password of a virtual user cannot be changed")

    result = UserRead.model_validate(
        crud_user.update(db=db, id=virtual_user_id, update_dto=user)
    )
    ws.emit_to_project(DATSEvent.USER_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{virtual_user_id}",
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
    virtual_user_id: int,
    db: DBSession,
    ws: WebsocketEmitter = Depends(),
) -> UserRead:
    result = UserRead.model_validate(
        crud_user.read_virtual_user(db=db, project_id=project_id, id=virtual_user_id)
    )
    crud_user.delete(db=db, id=virtual_user_id)
    ws.emit_to_project(DATSEvent.USER_DELETED, result, project_id=project_id)
    return result
