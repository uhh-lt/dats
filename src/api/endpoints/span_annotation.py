from typing import Optional

from fastapi import APIRouter, Depends
from requests import Session

from app.core.data.crud.memo import crud_memo
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import MemoReadSpanAnnotation, MemoCreate, MemoInDB
from app.core.data.dto.span_annotation import SpanAnnotationRead, SpanAnnotationUpdate
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/span")
tags = ["spanAnnotation"]

session = SQLService().get_db_session


@router.get("/{span_id}", tags=tags,
            response_model=Optional[SpanAnnotationRead],
            summary="Returns the SpanAnnotation",
            description="Returns the SpanAnnotation with the given ID.")
async def get_by_id(*,
                    db: Session = Depends(session),
                    span_id: int) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.read(db=db, id=span_id)
    return SpanAnnotationRead.from_orm(db_obj)


@router.patch("/{span_id}", tags=tags,
              response_model=Optional[SpanAnnotationRead],
              summary="Updates the SpanAnnotation",
              description="Updates the SpanAnnotation with the given ID.")
async def update_by_id(*,
                       db: Session = Depends(session),
                       span_id: int,
                       span_anno: SpanAnnotationUpdate) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_anno.update(db=db, id=span_id, update_dto=span_anno)
    return SpanAnnotationRead.from_orm(db_obj)


@router.delete("/{span_id}", tags=tags,
               response_model=Optional[SpanAnnotationRead],
               summary="Deletes the SpanAnnotation",
               description="Deletes the SpanAnnotation with the given ID.")
async def delete_by_id(*,
                       db: Session = Depends(session),
                       span_id: int) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc.remove(db=db, id=span_id)
    return SpanAnnotationRead.from_orm(db_obj)


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
