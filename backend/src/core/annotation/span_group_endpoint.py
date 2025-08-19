from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session, skip_limit_params
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import (
    SpanGroupCreate,
    SpanGroupRead,
    SpanGroupUpdate,
    SpanGroupWithAnnotationsRead,
)
from core.auth.authz_user import AuthzUser

router = APIRouter(
    prefix="/spangroup", dependencies=[Depends(get_current_user)], tags=["spanGroup"]
)


@router.put(
    "",
    response_model=SpanGroupRead | None,
    summary="Creates a new SpanGroup and returns it with the generated ID.",
)
def create_new_span_group(
    *,
    db: Session = Depends(get_db_session),
    span_group: SpanGroupCreate,
    authz_user: AuthzUser = Depends(),
) -> SpanGroupRead | None:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, span_group.sdoc_id)

    db_obj = crud_span_group.create(
        db=db, user_id=authz_user.user.id, create_dto=span_group
    )
    return SpanGroupRead.model_validate(db_obj)


@router.get(
    "/{span_group_id}",
    response_model=SpanGroupRead | None,
    summary="Returns the SpanGroup with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_group_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanGroupRead | None:
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, span_group_id)

    db_obj = crud_span_group.read(db=db, id=span_group_id)
    return SpanGroupRead.model_validate(db_obj)


@router.patch(
    "/{span_group_id}",
    response_model=SpanGroupRead | None,
    summary="Updates the SpanGroup with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_group_id: int,
    span_anno: SpanGroupUpdate,
    authz_user: AuthzUser = Depends(),
) -> SpanGroupRead | None:
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, span_group_id)

    db_obj = crud_span_group.update(db=db, id=span_group_id, update_dto=span_anno)
    return SpanGroupRead.model_validate(db_obj)


@router.delete(
    "/{span_group_id}",
    response_model=SpanGroupRead | None,
    summary="Deletes the SpanGroup with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_group_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanGroupRead | None:
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, span_group_id)

    db_obj = crud_span_group.delete(db=db, id=span_group_id)
    return SpanGroupRead.model_validate(db_obj)


@router.get(
    "/{span_group_id}/span_annotations",
    response_model=list[SpanAnnotationRead],
    summary="Returns all SpanAnnotations in the SpanGroup with the given ID if it exists",
)
def get_annotations(
    *,
    db: Session = Depends(get_db_session),
    span_group_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[SpanAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, span_group_id)

    span_group_db_obj = crud_span_group.read(db=db, id=span_group_id)
    spans = span_group_db_obj.span_annotations
    return [SpanAnnotationRead.model_validate(span) for span in spans]


@router.get(
    "/sdoc/{sdoc_id}",
    response_model=list[SpanGroupRead],
    summary="Returns all SpanGroups of the logged-in User if it exists",
)
def get_by_sdoc(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    skip_limit: dict[str, int] = Depends(skip_limit_params),
    authz_user: AuthzUser = Depends(),
) -> list[SpanGroupRead]:
    return [
        SpanGroupRead.model_validate(group)
        for group in crud_span_group.read_by_user_and_sdoc(
            db=db, user_id=authz_user.user.id, sdoc_id=sdoc_id, **skip_limit
        )
    ]


@router.get(
    "/sdoc/{sdoc}/user/{user_id}",
    response_model=list[SpanGroupWithAnnotationsRead],
    summary="Returns all SpanGroupWithAnnotations of the User in the sDoc",
)
def get_by_sdoc_and_user(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[SpanGroupWithAnnotationsRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    span_group_db_obj = crud_span_group.read_by_user_and_sdoc(
        db, user_id=user_id, sdoc_id=sdoc_id
    )
    return [
        SpanGroupWithAnnotationsRead.model_validate(group)
        for group in span_group_db_obj
    ]
