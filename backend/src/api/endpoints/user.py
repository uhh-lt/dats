from typing import Dict, List, Optional

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.user import crud_user
from app.core.data.dto.action import ActionType
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.user import PublicUserRead, UserRead, UserUpdate
from app.core.data.orm.user import UserORM
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import (
    get_current_user,
    get_db_session,
    is_authorized,
    skip_limit_params,
)

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
    response_model=Optional[PublicUserRead],
    summary="Returns the User",
    description="Returns the User with the given ID if it exists",
)
async def get_by_id(
    *, db: Session = Depends(get_db_session), user_id: int
) -> Optional[PublicUserRead]:
    db_user = crud_user.read(db=db, id=user_id)
    return PublicUserRead.from_orm(db_user)


@router.get(
    "",
    response_model=List[PublicUserRead],
    summary="Returns all Users",
    description="Returns all Users that exist in the system",
)
async def get_all(
    *,
    db: Session = Depends(get_db_session),
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
) -> List[PublicUserRead]:
    db_objs = crud_user.read_multi(db=db, **skip_limit)
    return [PublicUserRead.from_orm(proj) for proj in db_objs]


@router.patch(
    "/{user_id}",
    response_model=Optional[UserRead],
    summary="Updates the User",
    description="Updates the User with the given ID if it exists",
    dependencies=[is_authorized(ActionType.UPDATE, crud_user, "user_id")],
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
    dependencies=[is_authorized(ActionType.DELETE, crud_user, "user_id")],
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
    # Only users themselves can see what projects they are in
    dependencies=[is_authorized(ActionType.READ, crud_user, "user_id")],
)
async def get_user_projects(
    *, user_id: int, db: Session = Depends(get_db_session)
) -> List[ProjectRead]:
    db_obj = crud_user.read(db=db, id=user_id)
    return [ProjectRead.from_orm(proj) for proj in db_obj.projects]


@router.get(
    "/{user_id}/recent_activity",
    response_model=List[AnnotationDocumentRead],
    summary="Returns sdoc ids of sdocs the User recently modified (annotated)",
    description="Returns the top k sdoc ids that the User recently modified (annotated)",
    dependencies=[is_authorized(ActionType.READ, crud_user, "user_id")],
)
async def recent_activity(
    *, user_id: int, k: int, db: Session = Depends(get_db_session)
) -> List[AnnotationDocumentRead]:
    # get all adocs of a user
    user_adocs = [
        AnnotationDocumentRead.from_orm(db_obj)
        for db_obj in crud_adoc.read_by_user(db=db, user_id=user_id)
    ]

    # sort by updated (desc)
    user_adocs.sort(key=lambda adoc: adoc.updated, reverse=True)

    # get the topk k sdocs associated with the adocs
    return [adoc for adoc in user_adocs[:k]]
