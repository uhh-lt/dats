from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session, skip_limit_params
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.user import crud_user
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import MemoRead
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.user import UserRead, UserUpdate
from app.core.data.orm.user import UserORM

router = APIRouter(
    prefix="/user", dependencies=[Depends(get_current_user)], tags=["user"]
)


@router.get(
    "/me",
    response_model=Optional[UserRead],
    summary="Returns the current user",
    description="Returns the current (logged in) user",
)
async def get_me(*, user: UserORM = Depends(get_current_user)) -> Optional[UserRead]:
    return UserRead.from_orm(user)


@router.get(
    "/{user_id}",
    response_model=Optional[UserRead],
    summary="Returns the User",
    description="Returns the User with the given ID if it exists",
)
async def get_by_id(
    *, db: Session = Depends(get_db_session), user_id: int
) -> Optional[UserRead]:
    db_user = crud_user.read(db=db, id=user_id)
    return UserRead.from_orm(db_user)


@router.get(
    "",
    response_model=List[UserRead],
    summary="Returns all Users",
    description="Returns all Users that exist in the system",
)
async def get_all(
    *,
    db: Session = Depends(get_db_session),
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
) -> List[UserRead]:
    db_objs = crud_user.read_multi(db=db, **skip_limit)
    return [UserRead.from_orm(proj) for proj in db_objs]


@router.patch(
    "/{user_id}",
    response_model=Optional[UserRead],
    summary="Updates the User",
    description="Updates the User with the given ID if it exists",
)
async def update_by_id(
    *, db: Session = Depends(get_db_session), user_id: int, user: UserUpdate
) -> Optional[UserRead]:
    db_user = crud_user.update(db=db, id=user_id, update_dto=user)
    return UserRead.from_orm(db_user)


@router.delete(
    "/{user_id}",
    response_model=Optional[UserRead],
    summary="Removes the User",
    description="Removes the User with the given ID if it exists",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), user_id: int
) -> Optional[UserRead]:
    db_user = crud_user.remove(db=db, id=user_id)
    return UserRead.from_orm(db_user)


@router.get(
    "/{user_id}/project",
    response_model=List[ProjectRead],
    summary="Returns all Projects of the User",
    description="Returns all Projects of the User with the given ID",
)
async def get_user_projects(
    *, user_id: int, db: Session = Depends(get_db_session)
) -> List[ProjectRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_user.read(db=db, id=user_id)
    return [ProjectRead.from_orm(proj) for proj in db_obj.projects]


@router.get(
    "/{user_id}/code",
    response_model=List[CodeRead],
    summary="Returns all Codes of the User",
    description="Returns all Codes of the User with the given ID",
)
async def get_user_codes(
    *, user_id: int, db: Session = Depends(get_db_session)
) -> List[CodeRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_user.read(db=db, id=user_id)
    return [CodeRead.from_orm(code) for code in db_obj.codes]


@router.get(
    "/{user_id}/memo",
    response_model=List[MemoRead],
    summary="Returns all Memos of the User",
    description="Returns all Memos of the User with the given ID",
)
async def get_user_memos(
    *, user_id: int, db: Session = Depends(get_db_session)
) -> List[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_user.read(db=db, id=user_id)
    return [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo)
        for memo in db_obj.memos
    ]


@router.get(
    "/{user_id}/adocs",
    response_model=List[AnnotationDocumentRead],
    summary="Returns all Adocs of the User",
    description="Returns all Adocs of the User with the given ID",
)
async def get_user_adocs(
    *, user_id: int, db: Session = Depends(get_db_session)
) -> List[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    return [
        AnnotationDocumentRead.from_orm(db_obj)
        for db_obj in crud_adoc.read_by_user(db=db, user_id=user_id)
    ]


@router.get(
    "/{user_id}/recent_activity",
    response_model=List[AnnotationDocumentRead],
    summary="Returns sdoc ids of sdocs the User recently modified (annotated)",
    description="Returns the top k sdoc ids that the User recently modified (annotated)",
)
async def recent_activity(
    *, user_id: int, k: int, db: Session = Depends(get_db_session)
) -> List[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?

    # get all adocs of a user
    user_adocs = [
        AnnotationDocumentRead.from_orm(db_obj)
        for db_obj in crud_adoc.read_by_user(db=db, user_id=user_id)
    ]

    # sort by updated (desc)
    user_adocs.sort(key=lambda adoc: adoc.updated, reverse=True)

    # get the topk k sdocs associated with the adocs
    return [adoc for adoc in user_adocs[:k]]
