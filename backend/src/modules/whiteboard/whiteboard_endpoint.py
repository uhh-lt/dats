from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from modules.whiteboard.whiteboard_crud import crud_whiteboard
from modules.whiteboard.whiteboard_dto import (
    WhiteboardCreate,
    WhiteboardCreateIntern,
    WhiteboardData,
    WhiteboardRead,
    WhiteboardUpdate,
    WhiteboardUpdateIntern,
)
from modules.whiteboard.whiteboard_service import WhiteboardService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/whiteboards", tags=["whiteboard"])


# --- create operations


@router.put(
    "",
    response_model=WhiteboardRead,
    summary="Creates an Whiteboard",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    whiteboard: WhiteboardCreate,
    ws: WebsocketEmitter = Depends(),
) -> WhiteboardRead:
    result = WhiteboardRead.model_validate(
        crud_whiteboard.create(
            db=db,
            project_id=project_id,
            create_dto=WhiteboardCreateIntern(**whiteboard.model_dump()),
        )
    )
    ws.emit_to_project(DATSEvent.WHITEBOARD_CREATED, result, project_id=project_id)
    return result


@router.put(
    "/{whiteboard_id}/duplicate",
    response_model=WhiteboardRead,
    summary="Duplicates the Whiteboard with the given ID if it exists",
)
def duplicate_by_id(
    *,
    db: DBSession,
    project_id: int,
    whiteboard_id: int,
    ws: WebsocketEmitter = Depends(),
) -> WhiteboardRead:
    db_obj = crud_whiteboard.duplicate_by_id(
        db=db, project_id=project_id, whiteboard_id=whiteboard_id
    )
    result = WhiteboardRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.WHITEBOARD_CREATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "",
    response_model=list[WhiteboardRead],
    summary="Returns the Whiteboards of the Project",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
) -> list[WhiteboardRead]:
    db_objs = crud_whiteboard.read_by_project(db=db, project_id=project_id)
    return [WhiteboardRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{whiteboard_id}",
    response_model=WhiteboardRead,
    summary="Returns the Whiteboard with the given ID if it exists",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    whiteboard_id: int,
) -> WhiteboardRead:
    db_obj = crud_whiteboard.read(db=db, project_id=project_id, id=whiteboard_id)
    return WhiteboardRead.model_validate(db_obj)


@router.get(
    "/{whiteboard_id}/data",
    response_model=WhiteboardData,
    summary="Returns the data of the objects on the Whiteboard with the given ID",
)
def get_data_by_id(
    *,
    db: DBSession,
    project_id: int,
    whiteboard_id: int,
) -> WhiteboardData:
    return WhiteboardService().read_whiteboard_data(
        db=db, project_id=project_id, whiteboard_id=whiteboard_id
    )


# --- update operations


@router.patch(
    "/{whiteboard_id}",
    response_model=WhiteboardRead,
    summary="Updates the Whiteboard with the given ID if it exists",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    whiteboard_id: int,
    whiteboard: WhiteboardUpdate,
    ws: WebsocketEmitter = Depends(),
) -> WhiteboardRead:
    update_data = whiteboard.model_dump(exclude_unset=True, exclude={"content"})
    if whiteboard.content is not None:
        update_data["content"] = whiteboard.content.model_dump(
            mode="json", exclude_unset=True
        )
    update_dto = WhiteboardUpdateIntern(**update_data)

    db_obj = crud_whiteboard.update(
        db=db, project_id=project_id, id=whiteboard_id, update_dto=update_dto
    )
    result = WhiteboardRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.WHITEBOARD_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{whiteboard_id}",
    response_model=WhiteboardRead,
    summary="Removes the Whiteboard with the given ID if it exists",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    whiteboard_id: int,
    ws: WebsocketEmitter = Depends(),
) -> WhiteboardRead:
    db_obj = crud_whiteboard.delete(db=db, project_id=project_id, id=whiteboard_id)
    result = WhiteboardRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.WHITEBOARD_DELETED, result, project_id=project_id)
    return result
