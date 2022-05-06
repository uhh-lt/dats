from typing import Optional, Union

from fastapi import APIRouter, Depends
from requests import Session

from api.dependencies import resolve_code_param, get_db_session
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.bbox_annotation import BBoxAnnotationRead, BBoxAnnotationReadResolvedCode, BBoxAnnotationCreate, \
    BBoxAnnotationUpdate
from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import MemoCreate, MemoInDB, MemoRead, AttachedObjectType

router = APIRouter(prefix="/bbox")
tags = ["bboxAnnotation"]


@router.put("", tags=tags,
            response_model=Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]],
            summary="Creates a BBoxAnnotation",
            description="Creates a BBoxAnnotation")
async def add_span_annotation(*,
                              db: Session = Depends(get_db_session),
                              span: BBoxAnnotationCreate,
                              resolve_code: bool = Depends(resolve_code_param)) \
        -> Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.create(db=db, create_dto=span)
    span_dto = BBoxAnnotationRead.from_orm(db_obj)
    if resolve_code:
        return BBoxAnnotationReadResolvedCode(**span_dto.dict(exclude={"current_code_id"}),
                                              code=CodeRead.from_orm(db_obj.current_code.code))
    else:
        return span_dto


@router.get("/{span_id}", tags=tags,
            response_model=Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]],
            summary="Returns the BBoxAnnotation",
            description="Returns the BBoxAnnotation with the given ID.")
async def get_by_id(*,
                    db: Session = Depends(get_db_session),
                    span_id: int,
                    resolve_code: bool = Depends(resolve_code_param)) -> Optional[
    Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.read(db=db, id=span_id)
    span_dto = BBoxAnnotationRead.from_orm(db_obj)
    if resolve_code:
        return BBoxAnnotationReadResolvedCode(**span_dto.dict(exclude={"current_code_id"}),
                                              code=CodeRead.from_orm(db_obj.current_code.code))
    else:
        return span_dto


@router.patch("/{span_id}", tags=tags,
              response_model=Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]],
              summary="Updates the BBoxAnnotation",
              description="Updates the BBoxAnnotation with the given ID.")
async def update_by_id(*,
                       db: Session = Depends(get_db_session),
                       span_id: int,
                       span_anno: BBoxAnnotationUpdate,
                       resolve_code: bool = Depends(resolve_code_param)) -> Optional[
    Union[BBoxAnnotationRead,
          BBoxAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.update(db=db, id=span_id, update_dto=span_anno)
    span_dto = BBoxAnnotationRead.from_orm(db_obj)
    if resolve_code:
        return BBoxAnnotationReadResolvedCode(**span_dto.dict(exclude={"current_code_id"}),
                                              code=CodeRead.from_orm(db_obj.current_code.code))
    else:
        return span_dto


@router.delete("/{span_id}", tags=tags,
               response_model=Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]],
               summary="Deletes the BBoxAnnotation",
               description="Deletes the BBoxAnnotation with the given ID.")
async def delete_by_id(*,
                       db: Session = Depends(get_db_session),
                       span_id: int) -> Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.remove(db=db, id=span_id)
    return BBoxAnnotationRead.from_orm(db_obj)


@router.get("/{span_id}/code", tags=tags,
            response_model=Optional[CodeRead],
            summary="Returns the Code of the BBoxAnnotation",
            description="Returns the Code of the BBoxAnnotation with the given ID if it exists.")
async def get_code(*,
                   db: Session = Depends(get_db_session),
                   span_id: int) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    return CodeRead.from_orm(span_db_obj.current_code.code)


@router.put("/{span_id}/memo", tags=tags,
            response_model=Optional[MemoRead],
            summary="Adds a Memo to the BBoxAnnotation",
            description="Adds a Memo to the BBoxAnnotation with the given ID if it exists")
async def add_memo(*,
                   db: Session = Depends(get_db_session),
                   span_id: int,
                   memo: MemoCreate) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_span_annotation(db=db, span_anno_id=span_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                    attached_object_id=span_id,
                    attached_object_type=AttachedObjectType.span_annotation)


@router.get("/{span_id}/memo", tags=tags,
            response_model=Optional[MemoRead],
            summary="Returns the Memo attached to the BBoxAnnotation",
            description="Returns the Memo attached to the BBoxAnnotation with the given ID if it exists.")
async def get_memo(*,
                   db: Session = Depends(get_db_session),
                   span_id: int) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    memo_as_in_db_dto = MemoInDB.from_orm(span_db_obj.object_handle.attached_memo)
    return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                    attached_object_id=span_id,
                    attached_object_type=AttachedObjectType.span_annotation)
