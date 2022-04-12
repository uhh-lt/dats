from typing import Optional, Union, List

from fastapi import APIRouter, Depends
from requests import Session

from api.dependencies import resolve_code_param
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import MemoReadSpanAnnotation, MemoCreate, MemoInDB
from app.core.data.dto.span_annotation import SpanAnnotationRead, SpanAnnotationUpdate, SpanAnnotationCreate, \
    SpanAnnotationReadResolvedCode
from app.core.data.dto.span_group import SpanGroupRead
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/span")
tags = ["spanAnnotation"]

session = SQLService().get_db_session


@router.put("", tags=tags,
            response_model=Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolvedCode]],
            summary="Creates a SpanAnnotation",
            description="Creates a SpanAnnotation")
async def add_span_annotation(*,
                              db: Session = Depends(session),
                              span: SpanAnnotationCreate,
                              resolve_code: bool = Depends(resolve_code_param)) \
        -> Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.create(db=db, create_dto=span)
    span_dto = SpanAnnotationRead.from_orm(db_obj)
    if resolve_code:
        return SpanAnnotationReadResolvedCode(**span_dto.dict(exclude={"current_code_id"}),
                                              code=CodeRead.from_orm(db_obj.current_code.code))
    else:
        return span_dto


@router.get("/{span_id}", tags=tags,
            response_model=Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolvedCode]],
            summary="Returns the SpanAnnotation",
            description="Returns the SpanAnnotation with the given ID.")
async def get_by_id(*,
                    db: Session = Depends(session),
                    span_id: int,
                    resolve_code: bool = Depends(resolve_code_param)) -> Optional[
    Union[SpanAnnotationRead, SpanAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.read(db=db, id=span_id)
    span_dto = SpanAnnotationRead.from_orm(db_obj)
    if resolve_code:
        return SpanAnnotationReadResolvedCode(**span_dto.dict(exclude={"current_code_id"}),
                                              code=CodeRead.from_orm(db_obj.current_code.code))
    else:
        return span_dto


@router.patch("/{span_id}", tags=tags,
              response_model=Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolvedCode]],
              summary="Updates the SpanAnnotation",
              description="Updates the SpanAnnotation with the given ID.")
async def update_by_id(*,
                       db: Session = Depends(session),
                       span_id: int,
                       span_anno: SpanAnnotationUpdate,
                       resolve_code: bool = Depends(resolve_code_param)) -> Optional[
    Union[SpanAnnotationRead,
          SpanAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.update(db=db, id=span_id, update_dto=span_anno)
    span_dto = SpanAnnotationRead.from_orm(db_obj)
    if resolve_code:
        return SpanAnnotationReadResolvedCode(**span_dto.dict(exclude={"current_code_id"}),
                                              code=CodeRead.from_orm(db_obj.current_code.code))
    else:
        return span_dto


@router.delete("/{span_id}", tags=tags,
               response_model=Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolvedCode]],
               summary="Deletes the SpanAnnotation",
               description="Deletes the SpanAnnotation with the given ID.")
async def delete_by_id(*,
                       db: Session = Depends(session),
                       span_id: int) -> Optional[Union[SpanAnnotationRead, SpanAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.remove(db=db, id=span_id)
    return SpanAnnotationRead.from_orm(db_obj)


@router.get("/{span_id}/code", tags=tags,
            response_model=Optional[CodeRead],
            summary="Returns the Code of the SpanAnnotation",
            description="Returns the Code of the SpanAnnotation with the given ID if it exists.")
async def get_code(*,
                   db: Session = Depends(session),
                   span_id: int) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    return CodeRead.from_orm(span_db_obj.current_code.code)


@router.get("/{span_id}/groups", tags=tags,
            response_model=List[SpanGroupRead],
            summary="Returns all SpanGroups that contain the the SpanAnnotation",
            description="Returns all SpanGroups that contain the the SpanAnnotation.")
async def get_all_groups(*,
                         db: Session = Depends(session),
                         span_id: int) -> List[SpanGroupRead]:
    # TODO Flo: only if the user has access?
    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    return [SpanGroupRead.from_orm(span_group_db_obj) for span_group_db_obj in span_db_obj.span_groups]


@router.delete("/{span_id}/groups", tags=tags,
               response_model=Optional[SpanAnnotationRead],
               summary="Removes the SpanAnnotation from all SpanGroups",
               description="Removes the SpanAnnotation from all SpanGroups")
async def remove_from_all_groups(*,
                                 db: Session = Depends(session),
                                 span_id: int) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    span_db_obj = crud_span_anno.remove_from_all_span_groups(db=db, span_id=span_id)
    return SpanAnnotationRead.from_orm(span_db_obj)


@router.patch("/{span_id}/group/{group_id}", tags=tags,
              response_model=Optional[SpanAnnotationRead],
              summary="Adds the SpanAnnotation to the SpanGroup",
              description="Adds the SpanAnnotation to the SpanGroup")
async def add_to_group(*,
                       db: Session = Depends(session),
                       span_id: int,
                       group_id: int) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_span_anno.add_to_span_group(db=db, span_id=span_id, group_id=group_id)
    return SpanAnnotationRead.from_orm(sdoc_db_obj)


@router.delete("/{span_id}/group/{group_id}", tags=tags,
               response_model=Optional[SpanAnnotationRead],
               summary="Removes the SpanAnnotation from the SpanGroup",
               description="Removes the SpanAnnotation from the SpanGroup")
async def remove_from_group(*,
                            db: Session = Depends(session),
                            span_id: int,
                            group_id: int) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_span_anno.remove_from_span_group(db=db, span_id=span_id, group_id=group_id)
    return SpanAnnotationRead.from_orm(sdoc_db_obj)


@router.put("/{span_id}/memo", tags=tags,
            response_model=Optional[MemoReadSpanAnnotation],
            summary="Adds a Memo to the SpanAnnotation",
            description="Adds a Memo to the SpanAnnotation with the given ID if it exists")
async def add_memo(*,
                   db: Session = Depends(session),
                   span_id: int,
                   memo: MemoCreate) -> Optional[MemoReadSpanAnnotation]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_span_annotation(db=db, span_anno_id=span_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    attached_span_anno = db_obj.attached_to.span_annotation
    return MemoReadSpanAnnotation(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                                  attached_span_annotation_id=attached_span_anno.id)


@router.get("/{span_id}/memo", tags=tags,
            response_model=Optional[MemoReadSpanAnnotation],
            summary="Returns the Memo attached to the SpanAnnotation",
            description="Returns the Memo attached to the SpanAnnotation with the given ID if it exists.")
async def get_memo(*,
                   db: Session = Depends(session),
                   span_id: int) -> Optional[MemoReadSpanAnnotation]:
    # TODO Flo: only if the user has access?
    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    memo_as_in_db_dto = MemoInDB.from_orm(span_db_obj.object_handle.attached_memo)
    return MemoReadSpanAnnotation(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                                  attached_span_annotation_id=span_db_obj.id)
