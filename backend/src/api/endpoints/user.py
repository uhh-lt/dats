from typing import Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import (
    get_current_user,
    get_db_session,
    skip_limit_params,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.user import PublicUserRead, UserRead, UserUpdate
from app.core.data.orm.user import UserORM

router = APIRouter(
    prefix="/user", dependencies=[Depends(get_current_user)], tags=["user"]
)


@router.get(
    "/me",
    response_model=UserRead,
    summary="Returns the current (logged in) user",
)
def get_me(*, user: UserORM = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)


@router.get(
    "/{user_id}",
    response_model=PublicUserRead,
    summary="Returns the User with the given ID if it exists",
)
def get_by_id(*, db: Session = Depends(get_db_session), user_id: int) -> PublicUserRead:
    db_user = crud_user.read(db=db, id=user_id)
    return PublicUserRead.model_validate(db_user)


@router.get(
    "",
    response_model=List[PublicUserRead],
    summary="Returns all Users that exist in the system",
)
def get_all(
    *,
    db: Session = Depends(get_db_session),
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
) -> List[PublicUserRead]:
    db_objs = crud_user.read_multi(db=db, **skip_limit)
    return [PublicUserRead.model_validate(proj) for proj in db_objs]


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="Updates the User with the given ID if it exists",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    user_id: int,
    user: UserUpdate,
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    if authz_user.user.id != SYSTEM_USER_ID:
        authz_user.assert_is_same_user(user_id)

    db_user = crud_user.update(db=db, id=user_id, update_dto=user)
    return UserRead.model_validate(db_user)


@router.delete(
    "/{user_id}",
    response_model=UserRead,
    summary="Removes the User with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    if authz_user.user.id != SYSTEM_USER_ID:
        authz_user.assert_is_same_user(user_id)

    db_user = crud_user.remove(db=db, id=user_id)
    return UserRead.model_validate(db_user)


@router.get(
    "/{user_id}/project",
    response_model=List[ProjectRead],
    summary="Returns all Projects of the User with the given ID",
)
def get_user_projects(
    *,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[ProjectRead]:
    authz_user.assert_is_same_user(user_id)

    db_obj = crud_user.read(db=db, id=user_id)
    return [ProjectRead.model_validate(proj) for proj in db_obj.projects]


@router.get(
    "/{user_id}/recent_activity",
    response_model=List[AnnotationDocumentRead],
    summary="Returns the top k sdoc ids that the User recently modified (annotated)",
)
def recent_activity(
    *,
    user_id: int,
    k: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[AnnotationDocumentRead]:
    authz_user.assert_is_same_user(user_id)

    # get all adocs of a user
    user_adocs = [
        AnnotationDocumentRead.model_validate(db_obj)
        for db_obj in crud_adoc.read_by_user(db=db, user_id=user_id)
    ]

    # sort by updated (desc)
    user_adocs.sort(key=lambda adoc: adoc.updated, reverse=True)

    # get the topk k sdocs associated with the adocs
    return [adoc for adoc in user_adocs[:k]]
