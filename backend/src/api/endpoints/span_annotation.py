from typing import List, Union

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session, resolve_code_param
from api.util import get_object_memo_for_user, get_object_memos
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import (
    AttachedObjectType,
    MemoCreate,
    MemoCreateIntern,
    MemoInDB,
    MemoRead,
)
from app.core.data.dto.span_annotation import (
    SpanAnnotationCreate,
    SpanAnnotationRead,
    SpanAnnotationReadResolved,
    SpanAnnotationUpdate,
    SpanAnnotationUpdateBulk,
)
from app.core.data.dto.span_group import SpanGroupRead

router = APIRouter(
    prefix="/span", dependencies=[Depends(get_current_user)], tags=["spanAnnotation"]
)


@router.put(
    "",
    response_model=Union[SpanAnnotationRead, SpanAnnotationReadResolved],
    summary="Creates a SpanAnnotation",
)
def add_span_annotation(
    *,
    db: Session = Depends(get_db_session),
    span: SpanAnnotationCreate,
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> Union[SpanAnnotationRead, SpanAnnotationReadResolved]:
    authz_user.assert_in_same_project_as(Crud.CODE, span.code_id)
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, span.sdoc_id)
    validate.validate_objects_in_same_project(
        [
            (Crud.CODE, span.code_id),
            (Crud.SOURCE_DOCUMENT, span.sdoc_id),
        ]
    )

    db_obj = crud_span_anno.create(db=db, user_id=authz_user.user.id, create_dto=span)
    if resolve_code:
        return SpanAnnotationReadResolved.model_validate(db_obj)
    else:
        return SpanAnnotationRead.model_validate(db_obj)


@router.put(
    "/bulk/create",
    response_model=Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]],
    summary="Creates a SpanAnnotations in Bulk",
)
def add_span_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    spans: List[SpanAnnotationCreate],
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]]:
    for span in spans:
        authz_user.assert_in_same_project_as(Crud.CODE, span.code_id)
        authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, span.sdoc_id)
        validate.validate_objects_in_same_project(
            [
                (Crud.CODE, span.code_id),
                (Crud.SOURCE_DOCUMENT, span.sdoc_id),
            ]
        )

    db_objs = crud_span_anno.create_bulk(
        db=db, user_id=authz_user.user.id, create_dtos=spans
    )
    if resolve_code:
        return [SpanAnnotationReadResolved.model_validate(db_obj) for db_obj in db_objs]
    else:
        return [SpanAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{span_id}",
    response_model=Union[SpanAnnotationRead, SpanAnnotationReadResolved],
    summary="Returns the SpanAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[SpanAnnotationRead, SpanAnnotationReadResolved]:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    db_obj = crud_span_anno.read(db=db, id=span_id)
    if resolve_code:
        return SpanAnnotationReadResolved.model_validate(db_obj)
    else:
        return SpanAnnotationRead.model_validate(db_obj)


@router.patch(
    "/{span_id}",
    response_model=Union[SpanAnnotationRead, SpanAnnotationReadResolved],
    summary="Updates the SpanAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    span_anno: SpanAnnotationUpdate,
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> Union[SpanAnnotationRead, SpanAnnotationReadResolved]:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)
    authz_user.assert_in_same_project_as(Crud.CODE, span_anno.code_id)
    validate.validate_objects_in_same_project(
        [(Crud.SPAN_ANNOTATION, span_id), (Crud.CODE, span_anno.code_id)]
    )

    db_obj = crud_span_anno.update(db=db, id=span_id, update_dto=span_anno)
    if resolve_code:
        return SpanAnnotationReadResolved.model_validate(db_obj)
    else:
        return SpanAnnotationRead.model_validate(db_obj)


@router.patch(
    "/bulk/update",
    response_model=Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]],
    summary="Updates SpanAnnotations in Bulk",
)
def update_span_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    spans: List[SpanAnnotationUpdateBulk],
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]]:
    for span in spans:
        authz_user.assert_in_same_project_as(Crud.CODE, span.code_id)
        authz_user.assert_in_same_project_as(
            Crud.SPAN_ANNOTATION, span.span_annotation_id
        )
        validate.validate_objects_in_same_project(
            [
                (Crud.CODE, span.code_id),
                (Crud.SPAN_ANNOTATION, span.span_annotation_id),
            ]
        )

    db_objs = crud_span_anno.update_bulk(db=db, update_dtos=spans)
    if resolve_code:
        return [SpanAnnotationReadResolved.model_validate(db_obj) for db_obj in db_objs]
    else:
        return [SpanAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.delete(
    "/{span_id}",
    response_model=Union[SpanAnnotationRead, SpanAnnotationReadResolved],
    summary="Deletes the SpanAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> Union[SpanAnnotationRead, SpanAnnotationReadResolved]:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    db_obj = crud_span_anno.remove(db=db, id=span_id)
    return SpanAnnotationRead.model_validate(db_obj)


@router.get(
    "/{span_id}/code",
    response_model=CodeRead,
    summary="Returns the Code of the SpanAnnotation with the given ID if it exists.",
)
def get_code(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    return CodeRead.model_validate(span_db_obj.code)


@router.get(
    "/{span_id}/groups",
    response_model=List[SpanGroupRead],
    summary="Returns all SpanGroups that contain the the SpanAnnotation.",
)
def get_all_groups(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[SpanGroupRead]:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    return [
        SpanGroupRead.model_validate(span_group_db_obj)
        for span_group_db_obj in span_db_obj.span_groups
    ]


@router.delete(
    "/{span_id}/groups",
    response_model=SpanAnnotationRead,
    summary="Removes the SpanAnnotation from all SpanGroups",
)
def remove_from_all_groups(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    span_db_obj = crud_span_anno.remove_from_all_span_groups(db=db, span_id=span_id)
    return SpanAnnotationRead.model_validate(span_db_obj)


@router.patch(
    "/{span_id}/group/{group_id}",
    response_model=SpanAnnotationRead,
    summary="Adds the SpanAnnotation to the SpanGroup",
)
def add_to_group(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    group_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, group_id)

    sdoc_db_obj = crud_span_anno.add_to_span_group(
        db=db, span_id=span_id, group_id=group_id
    )
    return SpanAnnotationRead.model_validate(sdoc_db_obj)


@router.delete(
    "/{span_id}/group/{group_id}",
    response_model=SpanAnnotationRead,
    summary="Removes the SpanAnnotation from the SpanGroup",
)
def remove_from_group(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    group_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, group_id)

    sdoc_db_obj = crud_span_anno.remove_from_span_group(
        db=db, span_id=span_id, group_id=group_id
    )
    return SpanAnnotationRead.model_validate(sdoc_db_obj)


@router.put(
    "/{span_id}/memo",
    response_model=MemoRead,
    summary="Adds a Memo to the SpanAnnotation with the given ID if it exists",
)
def add_memo(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    memo: MemoCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> MemoRead:
    span_anno = crud_span_anno.read(db, span_id)
    proj_id = span_anno.annotation_document.source_document.project_id

    authz_user.assert_in_project(project_id=proj_id)

    db_obj = crud_memo.create_for_span_annotation(
        db=db,
        span_anno_id=span_id,
        create_dto=MemoCreateIntern(
            **memo.model_dump(), user_id=authz_user.user.id, project_id=proj_id
        ),
    )
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=span_id,
        attached_object_type=AttachedObjectType.span_annotation,
    )


@router.get(
    "/{span_id}/memo",
    response_model=List[MemoRead],
    summary="Returns the Memos attached to the SpanAnnotation with the given ID if it exists.",
)
def get_memos(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    db_obj = crud_span_anno.read(db=db, id=span_id)
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{span_id}/memo/user",
    response_model=MemoRead,
    summary=(
        "Returns the Memo attached to the SpanAnnotation with the given ID of the logged-in User if it exists."
    ),
)
def get_user_memo(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    db_obj = crud_span_anno.read(db=db, id=span_id)
    return get_object_memo_for_user(db_obj=db_obj, user_id=authz_user.user.id)


@router.get(
    "/code/{code_id}/user",
    response_model=List[SpanAnnotationReadResolved],
    summary=("Returns SpanAnnotations with the given Code of the logged-in User"),
)
def get_by_user_code(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[SpanAnnotationReadResolved]:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_objs = crud_span_anno.read_by_code_and_user(
        db=db, code_id=code_id, user_id=authz_user.user.id
    )
    return [SpanAnnotationReadResolved.model_validate(db_obj) for db_obj in db_objs]
