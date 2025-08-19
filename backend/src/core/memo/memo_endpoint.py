from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud, MemoCrud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.auth.validation import Validate
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import (
    AttachedObjectType,
    MemoCreate,
    MemoCreateIntern,
    MemoInDB,
    MemoRead,
    MemoUpdate,
)
from core.memo.memo_generation_service import generate_memo_ollama
from core.memo.memo_utils import get_object_memo_for_user, get_object_memos

router = APIRouter(
    prefix="/memo", dependencies=[Depends(get_current_user)], tags=["memo"]
)


attachedObject2Crud: dict[AttachedObjectType, MemoCrud] = {
    AttachedObjectType.tag: MemoCrud.TAG,
    AttachedObjectType.source_document: MemoCrud.SOURCE_DOCUMENT,
    AttachedObjectType.code: MemoCrud.CODE,
    AttachedObjectType.bbox_annotation: MemoCrud.BBOX_ANNOTATION,
    AttachedObjectType.span_annotation: MemoCrud.SPAN_ANNOTATION,
    AttachedObjectType.sentence_annotation: MemoCrud.SENTENCE_ANNOTATION,
    AttachedObjectType.span_group: MemoCrud.SPAN_GROUP,
    AttachedObjectType.project: MemoCrud.PROJECT,
}


@router.put(
    "",
    response_model=MemoRead,
    summary="Adds a Memo to the Attached Object with the given ID if it exists",
)
def add_memo(
    *,
    db: Session = Depends(get_db_session),
    attached_object_id: int,
    attached_object_type: AttachedObjectType,
    memo: MemoCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> MemoRead:
    crud = attachedObject2Crud.get(attached_object_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    # get project id of the attached object
    attached_object = crud.value.read(db=db, id=attached_object_id)
    proj_id = attached_object.get_project_id()
    if proj_id is None:
        raise ValueError("Attached object has no project")

    # check if user is authorized to add memo to the attached object
    authz_user.assert_in_project(project_id=proj_id)

    db_obj = crud_memo.create_for_attached_object(
        db=db,
        attached_object_id=attached_object_id,
        attached_object_type=attached_object_type,
        create_dto=MemoCreateIntern(
            **memo.model_dump(),
            user_id=authz_user.user.id,
            project_id=proj_id,
            uuid=str(uuid4()),
        ),
    )
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=attached_object_id,
        attached_object_type=attached_object_type,
    )


@router.get(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Returns the Memo with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    db_obj = crud_memo.read(db=db, id=memo_id)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.get(
    "/attached_obj/{attached_obj_type}/to/{attached_obj_id}",
    response_model=list[MemoRead],
    summary="Returns all Memos attached to the object if it exists",
)
def get_memos_by_attached_object_id(
    *,
    db: Session = Depends(get_db_session),
    attached_obj_id: int,
    attached_obj_type: AttachedObjectType,
    authz_user: AuthzUser = Depends(),
) -> list[MemoRead]:
    crud = attachedObject2Crud.get(attached_obj_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    # get project id of the attached object
    attached_object = crud.value.read(db=db, id=attached_obj_id)
    proj_id = attached_object.get_project_id()
    if proj_id is None:
        raise ValueError("Attached object has no project")

    # check if user is authorized to get memo from the attached object
    authz_user.assert_in_project(project_id=proj_id)

    return get_object_memos(db_obj=attached_object)


@router.get(
    "/attached_obj/{attached_obj_type}/to/{attached_obj_id}/user",
    response_model=MemoRead,
    summary="Returns the logged-in User's Memo attached to the object if it exists",
)
def get_user_memo_by_attached_object_id(
    *,
    db: Session = Depends(get_db_session),
    attached_obj_id: int,
    attached_obj_type: AttachedObjectType,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    crud = attachedObject2Crud.get(attached_obj_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    # get project id of the attached object
    attached_object = crud.value.read(db=db, id=attached_obj_id)
    proj_id = attached_object.get_project_id()
    if proj_id is None:
        raise ValueError("Attached object has no project")

    # check if user is authorized to get memo from the attached object
    authz_user.assert_in_project(project_id=proj_id)

    return get_object_memo_for_user(db_obj=attached_object, user_id=authz_user.user.id)


@router.patch(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Updates the Memo with the given ID if it exists",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    memo: MemoUpdate,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    db_obj = crud_memo.update(db=db, id=memo_id, update_dto=memo)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.delete(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Removes the Memo with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    memo = crud_memo.delete(db=db, id=memo_id)

    return crud_memo.get_memo_read_dto_from_orm(db, memo)


@router.get(
    "/generate_suggestion/{attached_obj_type}/{attached_obj_id}",
    response_model=str,
    summary="Generates a 1–2 sentence memo suggestion using LLM based on the attached object",
)
def generate_memo_suggestion(
    *,
    db: Session = Depends(get_db_session),
    attached_obj_id: int,
    attached_obj_type: AttachedObjectType,
    authz_user: AuthzUser = Depends(),
) -> str:
    crud = attachedObject2Crud.get(attached_obj_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    attached_object = crud.value.read(db=db, id=attached_obj_id)
    proj_id = attached_object.get_project_id()
    if proj_id is None:
        raise ValueError("Attached object has no project")

    authz_user.assert_in_project(project_id=proj_id)

    return generate_memo_ollama(attached_object, db)
