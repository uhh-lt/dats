from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate, CodeRead, CodeUpdate, CodeUpdateBulk
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/codes", tags=["codes", "mcp"])


# --- create operations


@router.put(
    "",
    response_model=CodeRead,
    summary="Creates a new Code and returns it with the generated ID.",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    code: CodeCreate,
    ws: WebsocketEmitter = Depends(),
) -> CodeRead:
    db_code = crud_code.create(db=db, project_id=project_id, create_dto=code)
    result = CodeRead.model_validate(db_code)
    ws.emit_to_project(DATSEvent.CODE_CREATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "",
    response_model=list[CodeRead],
    summary="Returns all Codes of the Project",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
) -> list[CodeRead]:
    db_objs = crud_code.read_by_project(db=db, project_id=project_id)
    return [CodeRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{code_id}",
    response_model=CodeRead,
    summary="Returns the Code with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    code_id: int,
) -> CodeRead:
    db_obj = crud_code.read(db=db, project_id=project_id, id=code_id)
    return CodeRead.model_validate(db_obj)


# --- update operations


@router.patch(
    "/bulk",
    response_model=list[CodeRead],
    summary="Updates the Codes with the given IDs.",
)
def update_bulk(
    *,
    db: DBSession,
    project_id: int,
    codes: list[CodeUpdateBulk],
    ws: WebsocketEmitter = Depends(),
) -> list[CodeRead]:
    db_objs = crud_code.update_multi(
        db=db,
        project_id=project_id,
        ids=[c.code_id for c in codes],
        update_dtos=[
            CodeUpdate.model_validate(
                c.model_dump(exclude_unset=True, exclude={"code_id"})
            )
            for c in codes
        ],
    )
    results = [CodeRead.model_validate(db_obj) for db_obj in db_objs]
    if results:
        ws.emit_to_project(DATSEvent.CODE_UPDATED_BATCH, results, project_id=project_id)
    return results


@router.patch(
    "/{code_id}",
    response_model=CodeRead,
    summary="Updates the Code with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    code_id: int,
    code: CodeUpdate,
    ws: WebsocketEmitter = Depends(),
) -> CodeRead:
    db_obj = crud_code.update(db=db, project_id=project_id, id=code_id, update_dto=code)
    result = CodeRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.CODE_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{code_id}",
    response_model=CodeRead,
    summary="Deletes the Code with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    code_id: int,
    ws: WebsocketEmitter = Depends(),
) -> CodeRead:
    db_obj = crud_code.read(db=db, project_id=project_id, id=code_id)
    result = CodeRead.model_validate(db_obj)
    crud_code.delete(db=db, project_id=project_id, id=code_id)
    ws.emit_to_project(DATSEvent.CODE_DELETED, result, project_id=project_id)
    return result
