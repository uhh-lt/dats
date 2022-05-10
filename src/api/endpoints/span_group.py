from typing import Optional, List, Union

from fastapi import APIRouter, Depends
from requests import Session

from api.dependencies import resolve_code_param, get_db_session
from app.core.data.crud.span_group import crud_span_group
from app.core.data.dto.code import CodeRead
from app.core.data.dto.span_annotation import SpanAnnotationRead, SpanAnnotationReadResolved
from app.core.data.dto.span_group import SpanGroupRead, SpanGroupUpdate, SpanGroupCreate

router = APIRouter(prefix="/spangroup")
tags = ["spanGroup"]


@router.put("", tags=tags,
            response_model=Optional[SpanGroupRead],
            summary="Creates a new SpanGroup",
            description="Creates a new SpanGroup and returns it with the generated ID.")
async def create_new_span_group(*,
                                db: Session = Depends(get_db_session),
                                span_group: SpanGroupCreate) -> Optional[SpanGroupRead]:
    db_obj = crud_span_group.create(db=db, create_dto=span_group)
    return SpanGroupRead.from_orm(db_obj)


@router.get("/{span_group_id}", tags=tags,
            response_model=Optional[SpanGroupRead],
            summary="Returns the SpanGroup",
            description="Returns the SpanGroup with the given ID.")
async def get_by_id(*,
                    db: Session = Depends(get_db_session),
                    span_group_id: int) -> Optional[SpanGroupRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_group.read(db=db, id=span_group_id)
    return SpanGroupRead.from_orm(db_obj)


@router.patch("/{span_group_id}", tags=tags,
              response_model=Optional[SpanGroupRead],
              summary="Updates the SpanGroup",
              description="Updates the SpanGroup with the given ID.")
async def update_by_id(*,
                       db: Session = Depends(get_db_session),
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
                       db: Session = Depends(get_db_session),
                       span_group_id: int) -> Optional[SpanGroupRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_span_group.remove(db=db, id=span_group_id)
    return SpanGroupRead.from_orm(db_obj)


@router.get("/{span_group_id}/span_annotations", tags=tags,
            response_model=List[Union[SpanAnnotationRead, SpanAnnotationReadResolved]],
            summary="Returns all SpanAnnotations in the SpanGroup",
            description="Returns all SpanAnnotations in the SpanGroup with the given ID if it exists")
async def get_all_annotations(*,
                              db: Session = Depends(get_db_session),
                              span_group_id: int,
                              resolve_code: bool = Depends(resolve_code_param)) \
        -> List[Union[SpanAnnotationRead, SpanAnnotationReadResolved]]:
    # TODO Flo: only if the user has access?
    span_group_db_obj = crud_span_group.read(db=db, id=span_group_id)
    spans = span_group_db_obj.span_annotations
    span_read_dtos = [SpanAnnotationRead.from_orm(span) for span in spans]
    if resolve_code:
        return [SpanAnnotationReadResolved(**span_dto.dict(exclude={"current_code_id", "span_text_id"}),
                                           code=CodeRead.from_orm(span_orm.current_code.code),
                                           span_text=span_orm.span_text.text)
                for span_orm, span_dto in zip(spans, span_read_dtos)]
    else:
        return span_read_dtos
