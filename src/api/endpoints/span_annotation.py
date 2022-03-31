from typing import Optional

from fastapi import APIRouter, Depends
from requests import Session

from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import MemoReadSpanAnnotation
from app.core.data.dto.span_annotation import SpanAnnotationRead
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/span_SpanAnnotation")
tags = ["span_SpanAnnotation"]

session = SQLService().get_db_session


@router.get("/{id}", tags=tags,
            response_model=Optional[SpanAnnotationRead],
            summary="Returns the SpanAnnotation",
            description="Returns the SpanAnnotation with the given ID.")
async def get_by_id(*,
                    db: Session = Depends(session),
                    id: int) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.patch("/{id}", tags=tags,
              response_model=Optional[SpanAnnotationRead],
              summary="Updates the SpanAnnotation",
              description="Updates the SpanAnnotation with the given ID.")
async def update_by_id(*,
                       db: Session = Depends(session),
                       id: int) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.delete("/{id}", tags=tags,
               response_model=Optional[SpanAnnotationRead],
               summary="Deletes the SpanAnnotation",
               description="Deletes the SpanAnnotation with the given ID.")
async def delete_by_id(*,
                       db: Session = Depends(session),
                       id: int) -> Optional[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.put("/{id}/memo", tags=tags,
            response_model=Optional[MemoReadSpanAnnotation],
            summary="Adds a Memo to the SpanAnnotation",
            description="Adds a Memo to the SpanAnnotation with the given ID if it exists")
async def add_memo(*,
                   db: Session = Depends(session),
                   id: int) -> Optional[MemoReadSpanAnnotation]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.get("/{id}/code", tags=tags,
            response_model=Optional[CodeRead],
            summary="Returns the Code of the SpanAnnotation",
            description="Returns the Code of the SpanAnnotation with the given ID if it exists.")
async def get_code(*,
                   db: Session = Depends(session),
                   id: int) -> Optional[MemoReadSpanAnnotation]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.get("/{id}/memo", tags=tags,
            response_model=Optional[MemoReadSpanAnnotation],
            summary="Returns the Memo attached to the SpanAnnotation",
            description="Returns the Memo attached to the SpanAnnotation with the given ID if it exists.")
async def get_memo(*,
                   db: Session = Depends(session),
                   id: int) -> Optional[MemoReadSpanAnnotation]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()
