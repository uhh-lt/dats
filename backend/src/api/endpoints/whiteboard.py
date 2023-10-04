from typing import List, Optional

from api.dependencies import get_db_session
from app.core.data.crud.whiteboard import crud_whiteboard
from app.core.data.dto.whiteboard import (
    WhiteboardCreate,
    WhiteboardRead,
    WhiteboardUpdate,
)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/whiteboard")
tags = ["whiteboard"]


@router.put(
    "",
    tags=tags,
    response_model=Optional[WhiteboardRead],
    summary="Creates an Whiteboard",
    description="Creates an Whiteboard",
)
async def create(
    *, db: Session = Depends(get_db_session), whiteboard: WhiteboardCreate
) -> Optional[WhiteboardRead]:
    return WhiteboardRead.from_orm(crud_whiteboard.create(db=db, create_dto=whiteboard))


@router.get(
    "/{whiteboard_id}",
    tags=tags,
    response_model=Optional[WhiteboardRead],
    summary="Returns the Whiteboard",
    description="Returns the Whiteboard with the given ID if it exists",
)
async def get_by_id(
    *, db: Session = Depends(get_db_session), whiteboard_id: int
) -> Optional[WhiteboardRead]:
    db_obj = crud_whiteboard.read(db=db, id=whiteboard_id)
    return WhiteboardRead.from_orm(db_obj)


@router.get(
    "/project/{project_id}/user/{user_id}",
    tags=tags,
    response_model=List[WhiteboardRead],
    summary="Returns Whiteboards of the Project of the User",
    description="Returns the Whiteboard of the Project with the given ID and the User with the given ID if it exists",
)
async def get_by_project_and_user(
    *, db: Session = Depends(get_db_session), project_id: int, user_id: int
) -> List[WhiteboardRead]:
    db_objs = crud_whiteboard.read_by_project_and_user(
        db=db, project_id=project_id, user_id=user_id, raise_error=False
    )
    return [WhiteboardRead.from_orm(db_obj) for db_obj in db_objs]


@router.patch(
    "/{whiteboard_id}",
    tags=tags,
    response_model=Optional[WhiteboardRead],
    summary="Updates the Whiteboard",
    description="Updates the Whiteboard with the given ID if it exists",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    whiteboard_id: int,
    whiteboard: WhiteboardUpdate
) -> Optional[WhiteboardRead]:
    db_obj = crud_whiteboard.update(db=db, id=whiteboard_id, update_dto=whiteboard)
    return WhiteboardRead.from_orm(db_obj)


@router.delete(
    "/{whiteboard_id}",
    tags=tags,
    response_model=Optional[WhiteboardRead],
    summary="Removes the Whiteboard",
    description="Removes the Whiteboard with the given ID if it exists",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), whiteboard_id: int
) -> Optional[WhiteboardRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_whiteboard.remove(db=db, id=whiteboard_id)
    return WhiteboardRead.from_orm(db_obj)
