from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from api.util import get_object_memo_for_user, get_object_memos
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.code import crud_code
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.code import CodeCreate, CodeRead, CodeUpdate
from app.core.data.dto.memo import (
    AttachedObjectType,
    MemoCreate,
    MemoCreateIntern,
    MemoInDB,
    MemoRead,
)

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

    db_obj = crud_code.update(db=db, id=code_id, update_dto=code)
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

    db_obj = crud_code.remove(db=db, id=code_id)
    return CodeRead.model_validate(db_obj)


@router.put(
    "/{code_id}/memo",
    response_model=MemoRead,
    summary="Adds a Memo to the Code with the given ID if it exists",
)
def add_memo(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    memo: MemoCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> MemoRead:
    code = crud_code.read(db, code_id)
    proj_id = code.project_id

    authz_user.assert_in_project(code.project_id)

    db_obj = crud_memo.create_for_code(
        db=db,
        code_id=code_id,
        create_dto=MemoCreateIntern(
            **memo.model_dump(), user_id=authz_user.user.id, project_id=proj_id
        ),
    )
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=code_id,
        attached_object_type=AttachedObjectType.code,
    )


@router.get(
    "/{code_id}/memo",
    response_model=List[MemoRead],
    summary="Returns the Memo attached to the Code with the given ID if it exists.",
)
def get_memos(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_obj = crud_code.read(db=db, id=code_id)
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{code_id}/memo/user",
    response_model=MemoRead,
    summary=(
        "Returns the Memo attached to the Code with the given ID of the logged-in User if it exists."
    ),
)
def get_user_memo(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_obj = crud_code.read(db=db, id=code_id)
    return get_object_memo_for_user(db_obj=db_obj, user_id=authz_user.user.id)
