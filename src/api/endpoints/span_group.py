from typing import Optional

from fastapi import APIRouter, Depends
from requests import Session

from app.core.data.crud.span_group import crud_span_group
from app.core.data.dto.span_group import SpanGroupRead, SpanGroupUpdate, SpanGroupCreate
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/spangroup")
tags = ["spanGroup"]

session = SQLService().get_db_session


@router.put("", tags=tags,
            response_model=Optional[SpanGroupRead],
            summary="Creates a new SpanGroup",
            description="Creates a new SpanGroup and returns it with the generated ID.")
async def create_new_span_group(*,
                                db: Session = Depends(session),
                                span_group: SpanGroupCreate) -> Optional[SpanGroupRead]:
    db_obj = crud_span_group.create(db=db, create_dto=span_group)
    return SpanGroupRead.from_orm(db_obj)


@router.get("/{span_group_id}", tags=tags,
            response_model=Optional[SpanGroupRead],
            summary="Returns the SpanGroup",
            description="Returns the SpanGroup with the given ID.")
async def get_by_id(*,
                    db: Session = Depends(session),
                    span_group_id: int) -> Optional[SpanGroupRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_group.read(db=db, id=span_group_id)
    return SpanGroupRead.from_orm(db_obj)


@router.patch("/{span_group_id}", tags=tags,
              response_model=Optional[SpanGroupRead],
              summary="Updates the SpanGroup",
              description="Updates the SpanGroup with the given ID.")
async def update_by_id(*,
                       db: Session = Depends(session),
                       span_group_id: int,
                       span_anno: SpanGroupUpdate) -> Optional[SpanGroupRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_group.update(db=db, id=span_group_id, update_dto=span_anno)
    return SpanGroupRead.from_orm(db_obj)


@router.delete("/{span_group_id}", tags=tags,
               response_model=Optional[SpanGroupRead],
               summary="Deletes the SpanGroup",
               description="Deletes the SpanGroup with the given ID.")
async def delete_by_id(*,
                       db: Session = Depends(session),
                       span_group_id: int) -> Optional[SpanGroupRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_group.remove(db=db, id=span_group_id)
    return SpanGroupRead.from_orm(db_obj)
