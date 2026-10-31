from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate, CodeRead, CodeUpdate, CodeUpdateBulk
from core.project.project_crud import crud_project
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/code", dependencies=[Depends(get_current_user)], tags=["code", "mcp"]
)


# --- create operations


@router.put(
    "",
    response_model=CodeRead,
    summary="Creates a new Code and returns it with the generated ID.",
)
def create_code(
    *,
    db: Session = Depends(get_db_session),
    code: CodeCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> CodeRead:
    authz_user.assert_in_project(code.project_id)
    if code.parent_id is not None:
        authz_user.assert_in_same_project_as(Crud.CODE, code.parent_id)

    db_code = crud_code.create(db=db, create_dto=code)
    result = CodeRead.model_validate(db_code)
    ws.emit_to_project(DATSEvent.CODE_CREATED, result, project_id=code.project_id)
    return result


# --- read operations


@router.get(
    "/{code_id}",
    response_model=CodeRead,
    summary="Returns the Code with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_obj = crud_code.read(db=db, id=code_id)
    return CodeRead.model_validate(db_obj)


@router.get(
    "/project/{project_id}",
    response_model=list[CodeRead],
    summary="Returns all Codes of the Project with the given ID",
)
def get_by_project(
    *,
    project_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[CodeRead]:
    authz_user.assert_in_project(project_id)

    proj_db_obj = crud_project.read(db=db, id=project_id)
    result = [CodeRead.model_validate(code) for code in proj_db_obj.codes]
    result.sort(key=lambda c: c.id)
    return result


# --- update operations


@router.patch(
    "/{code_id}",
    response_model=CodeRead,
    summary="Updates the Code with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    code: CodeUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    db_obj = crud_code.update(db=db, id=code_id, update_dto=code)
    result = CodeRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.CODE_UPDATED, result, project_id=db_obj.get_project_id()
    )
    return result


@router.patch(
    "/bulk/update",
    response_model=list[CodeRead],
    summary="Updates the Codes with the given IDs.",
)
def update_codes_bulk(
    *,
    db: Session = Depends(get_db_session),
    codes: list[CodeUpdateBulk],
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[CodeRead]:
    authz_user.assert_in_same_project_as_many(Crud.CODE, [c.code_id for c in codes])

    db_objs = crud_code.update_multi(
        db=db,
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
        ws.emit_dtos_to_projects(DATSEvent.CODE_UPDATED_BATCH, results)
    return results


# --- delete operations


@router.delete(
    "/{code_id}",
    response_model=CodeRead,
    summary="Deletes the Code with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_obj = crud_code.read(db=db, id=code_id)
    code_read = CodeRead.model_validate(db_obj)

    crud_code.delete(db=db, id=code_id)
    ws.emit_to_project(
        DATSEvent.CODE_DELETED, code_read, project_id=db_obj.get_project_id()
    )
    return code_read
