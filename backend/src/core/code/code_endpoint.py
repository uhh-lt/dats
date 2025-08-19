from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate, CodeRead, CodeUpdate
from core.project.project_crud import crud_project

router = APIRouter(
    prefix="/code", dependencies=[Depends(get_current_user)], tags=["code"]
)


@router.put(
    "",
    response_model=CodeRead,
    summary="Creates a new Code and returns it with the generated ID.",
)
def create_new_code(
    *,
    db: Session = Depends(get_db_session),
    code: CodeCreate,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    authz_user.assert_in_project(code.project_id)
    if code.parent_id is not None:
        authz_user.assert_in_same_project_as(Crud.CODE, code.parent_id)

    db_code = crud_code.create(db=db, create_dto=code)
    return CodeRead.model_validate(db_code)


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
    "/project/{proj_id}",
    response_model=list[CodeRead],
    summary="Returns all Codes of the Project with the given ID",
)
def get_by_project(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[CodeRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    result = [CodeRead.model_validate(code) for code in proj_db_obj.codes]
    result.sort(key=lambda c: c.id)
    return result


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
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    db_obj = crud_code.update_with_children(db=db, code_id=code_id, update_dto=code)
    return CodeRead.model_validate(db_obj)


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
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_obj = crud_code.read(db=db, id=code_id)
    code_read = CodeRead.model_validate(db_obj)

    crud_code.delete(db=db, id=code_id)
    return code_read
