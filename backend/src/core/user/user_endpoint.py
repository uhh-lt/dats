from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session, skip_limit_params
from core.auth.authz_user import AuthzUser
from core.project.project_crud import crud_project
from core.user.user_crud import crud_user
from core.user.user_dto import ProjectAddUser, PublicUserRead, UserRead, UserUpdate
from core.user.user_orm import UserORM

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
    "/by_id/{user_id}",
    response_model=PublicUserRead,
    summary="Returns the User with the given ID if it exists",
)
def get_by_id(*, db: Session = Depends(get_db_session), user_id: int) -> PublicUserRead:
    db_user = crud_user.read(db=db, id=user_id)
    return PublicUserRead.model_validate(db_user)


@router.get(
    "/{proj_id}/user",
    response_model=list[UserRead],
    summary="Returns all Users of the Project with the given ID",
)
def get_by_project(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[UserRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    return [UserRead.model_validate(user) for user in proj_db_obj.users]


@router.get(
    "/all",
    response_model=list[PublicUserRead],
    summary="Returns all Users that exist in the system",
)
def get_all(
    *,
    db: Session = Depends(get_db_session),
    skip_limit: dict[str, int] = Depends(skip_limit_params),
) -> list[PublicUserRead]:
    db_objs = crud_user.read_multi(db=db, **skip_limit)
    return [PublicUserRead.model_validate(proj) for proj in db_objs]


@router.patch(
    "/",
    response_model=UserRead,
    summary="Updates the logged-in User",
)
def update_me(
    *,
    db: Session = Depends(get_db_session),
    user: UserUpdate,
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    db_user = crud_user.update(db=db, id=authz_user.user.id, update_dto=user)
    return UserRead.model_validate(db_user)


@router.delete(
    "/",
    response_model=UserRead,
    summary="Removes the logged-in User",
)
def delete_me(
    *,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    db_user = crud_user.delete(db=db, id=authz_user.user.id)
    return UserRead.model_validate(db_user)


@router.patch(
    "/{proj_id}/user",
    response_model=UserRead,
    summary="Associates an existing User to the Project with the given ID if it exists",
)
def associate_user_to_project(
    *,
    proj_id: int,
    user: ProjectAddUser,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    authz_user.assert_in_project(proj_id)

    user_db_obj = crud_user.read_by_email(db=db, email=user.email)
    crud_project.associate_user(db=db, proj_id=proj_id, user_id=user_db_obj.id)
    return UserRead.model_validate(user_db_obj)


@router.delete(
    "/{proj_id}/user/{user_id}",
    response_model=UserRead,
    summary="Dissociates the Users with the Project with the given ID if it exists",
)
def dissociate_user_from_project(
    *,
    proj_id: int,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    authz_user.assert_in_project(proj_id)

    user_db_obj = crud_project.dissociate_user(db=db, proj_id=proj_id, user_id=user_id)
    return UserRead.model_validate(user_db_obj)
