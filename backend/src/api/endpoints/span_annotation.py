from typing import List, Optional, Union

from api.dependencies import get_current_user, get_db_session, resolve_code_param
from api.util import get_object_memos
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from app.core.data.dto.span_annotation import (
    SpanAnnotationCreateWithCodeId,
    SpanAnnotationRead,
    SpanAnnotationReadResolved,
    SpanAnnotationUpdateWithCodeId,
)
from app.core.data.dto.span_group import SpanGroupRead
from fastapi import APIRouter, Depends
from requests import Session

router = APIRouter(
    prefix="/span", dependencies=[Depends(get_current_user)], tags=["spanAnnotation"]
)


@router.put(
    "",
    response_model=Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolved]],
    summary="Creates a SpanAnnotation",
    description="Creates a SpanAnnotation",
)
async def add_span_annotation(
    *,
    db: Session = Depends(get_db_session),
    span: SpanAnnotationCreateWithCodeId,
    resolve_code: bool = Depends(resolve_code_param),
) -> Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolved]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.create_with_code_id(db=db, create_dto=span)
    span_dto = SpanAnnotationRead.model_validate(db_obj)
    if resolve_code:
        return SpanAnnotationReadResolved(
            **span_dto.model_dump(exclude={"current_code_id", "span_text_id"}),
            code=CodeRead.model_validate(db_obj.current_code.code),
            span_text=db_obj.span_text.text,
            user_id=db_obj.annotation_document.user_id,
            sdoc_id=db_obj.annotation_document.source_document_id,
        )
    else:
        return span_dto


@router.get(
    "/{span_id}",
    response_model=Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolved]],
    summary="Returns the SpanAnnotation",
    description="Returns the SpanAnnotation with the given ID.",
)
async def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    resolve_code: bool = Depends(resolve_code_param),
) -> Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolved]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.read(db=db, id=span_id)
    span_dto = SpanAnnotationRead.model_validate(db_obj)
    if resolve_code:
        return SpanAnnotationReadResolved(
            **span_dto.model_dump(exclude={"current_code_id", "span_text_id"}),
            code=CodeRead.model_validate(db_obj.current_code.code),
            span_text=db_obj.span_text.text,
            user_id=db_obj.annotation_document.user_id,
            sdoc_id=db_obj.annotation_document.source_document_id,
        )
    else:
        return span_dto


@router.patch(
    "/{span_id}",
    response_model=Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolved]],
    summary="Updates the SpanAnnotation",
    description="Updates the SpanAnnotation with the given ID.",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    span_anno: SpanAnnotationUpdateWithCodeId,
    resolve_code: bool = Depends(resolve_code_param),
) -> Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolved]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.update_with_code_id(db=db, id=span_id, update_dto=span_anno)
    span_dto = SpanAnnotationRead.model_validate(db_obj)
    if resolve_code:
        return SpanAnnotationReadResolved(
            **span_dto.model_dump(exclude={"current_code_id", "span_text_id"}),
            code=CodeRead.model_validate(db_obj.current_code.code),
            span_text=db_obj.span_text.text,
            user_id=db_obj.annotation_document.user_id,
            sdoc_id=db_obj.annotation_document.source_document_id,
        )
    else:
        return span_dto


@router.delete(
    "/{span_id}",
    response_model=Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolved]],
    summary="Deletes the SpanAnnotation",
    description="Deletes the SpanAnnotation with the given ID.",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), span_id: int
) -> Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolved]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.remove(db=db, id=span_id)
    return SpanAnnotationRead.model_validate(db_obj)


@router.get(
    "/{span_id}/code",
    response_model=Optional[CodeRead],
    summary="Returns the Code of the SpanAnnotation",
    description="Returns the Code of the SpanAnnotation with the given ID if it exists.",
)
async def get_code(
    *, db: Session = Depends(get_db_session), span_id: int
) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    return CodeRead.model_validate(span_db_obj.current_code.code)


@router.get(
    "/{span_id}/groups",
    response_model=List[SpanGroupRead],
    summary="Returns all SpanGroups that contain the the SpanAnnotation",
    description="Returns all SpanGroups that contain the the SpanAnnotation.",
)
async def get_all_groups(
    *, db: Session = Depends(get_db_session), span_id: int
) -> List[SpanGroupRead]:
    # TODO Flo: only if the user has access?
    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    return [
        SpanGroupRead.model_validate(span_group_db_obj)
        for span_group_db_obj in span_db_obj.span_groups
    ]


@router.delete(
    "/{span_id}/groups",
    response_model=Optional[SpanAnnotationRead],
    summary="Removes the SpanAnnotation from all SpanGroups",
    description="Removes the SpanAnnotation from all SpanGroups",
)
async def remove_from_all_groups(
    *, db: Session = Depends(get_db_session), span_id: int
) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    span_db_obj = crud_span_anno.remove_from_all_span_groups(db=db, span_id=span_id)
    return SpanAnnotationRead.model_validate(span_db_obj)


@router.patch(
    "/{span_id}/group/{group_id}",
    response_model=Optional[SpanAnnotationRead],
    summary="Adds the SpanAnnotation to the SpanGroup",
    description="Adds the SpanAnnotation to the SpanGroup",
)
async def add_to_group(
    *, db: Session = Depends(get_db_session), span_id: int, group_id: int
) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_span_anno.add_to_span_group(
        db=db, span_id=span_id, group_id=group_id
    )
    return SpanAnnotationRead.model_validate(sdoc_db_obj)


@router.delete(
    "/{span_id}/group/{group_id}",
    response_model=Optional[SpanAnnotationRead],
    summary="Removes the SpanAnnotation from the SpanGroup",
    description="Removes the SpanAnnotation from the SpanGroup",
)
async def remove_from_group(
    *, db: Session = Depends(get_db_session), span_id: int, group_id: int
) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_span_anno.remove_from_span_group(
        db=db, span_id=span_id, group_id=group_id
    )
    return SpanAnnotationRead.model_validate(sdoc_db_obj)


@router.put(
    "/{span_id}/memo",
    response_model=Optional[MemoRead],
    summary="Adds a Memo to the SpanAnnotation",
    description="Adds a Memo to the SpanAnnotation with the given ID if it exists",
)
async def add_memo(
    *, db: Session = Depends(get_db_session), span_id: int, memo: MemoCreate
) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_span_annotation(
        db=db, span_anno_id=span_id, create_dto=memo
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
    summary="Returns the Memo attached to the SpanAnnotation",
    description="Returns the Memo attached to the SpanAnnotation with the given ID if it exists.",
)
async def get_memos(
    *, db: Session = Depends(get_db_session), span_id: int
) -> List[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.read(db=db, id=span_id)
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{span_id}/memo/{user_id}",
    response_model=Optional[MemoRead],
    summary="Returns the Memo attached to the SpanAnnotation of the User with the given ID",
    description=(
        "Returns the Memo attached to the SpanAnnotation with the given ID of the User with the"
        " given ID if it exists."
    ),
)
async def get_user_memo(
    *, db: Session = Depends(get_db_session), span_id: int, user_id: int
) -> Optional[MemoRead]:
    db_obj = crud_span_anno.read(db=db, id=span_id)
    return get_object_memos(db_obj=db_obj, user_id=user_id)


@router.get(
    "/code/{code_id}/user/{user_id}",
    response_model=List[SpanAnnotationReadResolved],
    summary="Returns SpanAnnotations with the given Code of the User with the given ID",
    description=(
        "Returns SpanAnnotations with the given Code of the User with the given ID"
    ),
)
async def get_by_user_code(
    *, db: Session = Depends(get_db_session), code_id: int, user_id: int
) -> List[SpanAnnotationReadResolved]:
    db_objs = crud_span_anno.read_by_code_and_user(
        db=db, code_id=code_id, user_id=user_id
    )
    return [
        SpanAnnotationReadResolved(
            **SpanAnnotationRead.model_validate(db_obj).model_dump(
                exclude={"current_code_id", "span_text_id"}
            ),
            code=CodeRead.model_validate(db_obj.current_code.code),
            span_text=db_obj.span_text.text,
            user_id=db_obj.annotation_document.user_id,
            sdoc_id=db_obj.annotation_document.source_document_id,
        )
        for db_obj in db_objs
    ]
