from typing import Optional, List, Dict, Union

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import skip_limit_params, resolve_code_param, get_db_session
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.span_group import crud_span_group
from app.core.data.dto.annotation_document import AnnotationDocumentRead, AnnotationDocumentCreate
from app.core.data.dto.bbox_annotation import BBoxAnnotationRead, BBoxAnnotationReadResolvedCode
from app.core.data.dto.code import CodeRead
from app.core.data.dto.span_annotation import SpanAnnotationRead, SpanAnnotationReadResolved
from app.core.data.dto.span_group import SpanGroupRead

router = APIRouter(prefix="/adoc")
tags = ["annotationDocument"]


@router.put("", tags=tags,
            response_model=Optional[AnnotationDocumentRead],
            summary="Creates an AnnotationDocument",
            description="Creates an AnnotationDocument")
async def create(*,
                 db: Session = Depends(get_db_session),
                 adoc: AnnotationDocumentCreate) -> Optional[AnnotationDocumentRead]:
    return AnnotationDocumentRead.from_orm(crud_adoc.create(db=db, create_dto=adoc))


@router.get("/{adoc_id}", tags=tags,
            response_model=Optional[AnnotationDocumentRead],
            summary="Returns the AnnotationDocument",
            description="Returns the AnnotationDocument with the given ID if it exists")
async def get_by_adoc_id(*,
                         db: Session = Depends(get_db_session),
                         adoc_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_adoc.read(db=db, id=adoc_id)
    return AnnotationDocumentRead.from_orm(db_obj)


@router.delete("/{adoc_id}", tags=tags,
               response_model=Optional[AnnotationDocumentRead],
               summary="Removes the AnnotationDocument",
               description="Removes the AnnotationDocument with the given ID if it exists")
async def delete_by_adoc_id(*,
                            db: Session = Depends(get_db_session),
                            adoc_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_adoc.remove(db=db, id=adoc_id)
    return AnnotationDocumentRead.from_orm(db_obj)


@router.get("/{adoc_id}/span_annotations", tags=tags,
            response_model=List[Union[SpanAnnotationRead, SpanAnnotationReadResolved]],
            summary="Returns all SpanAnnotations in the AnnotationDocument",
            description="Returns all SpanAnnotations in the AnnotationDocument with the given ID if it exists")
async def get_all_span_annotations(*,
                                   db: Session = Depends(get_db_session),
                                   adoc_id: int,
                                   skip_limit: Dict[str, str] = Depends(skip_limit_params),
                                   resolve_code: bool = Depends(resolve_code_param)) \
        -> List[Union[SpanAnnotationRead, SpanAnnotationReadResolved]]:
    # TODO Flo: only if the user has access?
    spans = crud_span_anno.read_by_adoc(db=db,
                                        adoc_id=adoc_id,
                                        **skip_limit)
    span_read_dtos = [SpanAnnotationRead.from_orm(span) for span in spans]
    if resolve_code:
        return [SpanAnnotationReadResolved(**span_dto.dict(exclude={"current_code_id", "span_text_id"}),
                                           code=CodeRead.from_orm(span_orm.current_code.code),
                                           span_text=span_orm.span_text.text)
                for span_orm, span_dto in zip(spans, span_read_dtos)]
    else:
        return span_read_dtos


@router.delete("/{adoc_id}/span_annotations", tags=tags,
               response_model=List[int],
               summary="Removes all SpanAnnotations in the AnnotationDocument",
               description="Removes all SpanAnnotations in the AnnotationDocument with the given ID if it exists")
async def delete_all_span_annotations(*,
                                      db: Session = Depends(get_db_session),
                                      adoc_id: int) -> List[int]:
    # TODO Flo: only if the user has access? What to return?
    return crud_span_anno.remove_by_adoc(db=db, id=adoc_id)


@router.get("/{adoc_id}/bbox_annotations", tags=tags,
            response_model=List[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]],
            summary="Returns all BBoxAnnotations in the AnnotationDocument",
            description="Returns all BBoxAnnotations in the AnnotationDocument with the given ID if it exists")
async def get_all_bbox_annotations(*,
                                   db: Session = Depends(get_db_session),
                                   adoc_id: int,
                                   skip_limit: Dict[str, str] = Depends(skip_limit_params),
                                   resolve_code: bool = Depends(resolve_code_param)) \
        -> List[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    bboxes = crud_bbox_anno.read_by_adoc(db=db, adoc_id=adoc_id, **skip_limit)
    bbox_read_dtos = [BBoxAnnotationRead.from_orm(bbox) for bbox in bboxes]
    if resolve_code:
        return [BBoxAnnotationReadResolvedCode(**span_dto.dict(exclude={"current_code_id"}),
                                               code=CodeRead.from_orm(bbox_orm.current_code.code))
                for bbox_orm, span_dto in zip(bboxes, bbox_read_dtos)]
    else:
        return bbox_read_dtos


@router.delete("/{adoc_id}/bbox_annotations", tags=tags,
               response_model=List[int],
               summary="Removes all BBoxAnnotations in the AnnotationDocument",
               description="Removes all BBoxAnnotations in the AnnotationDocument with the given ID if it exists")
async def delete_all_bbox_annotations(*,
                                      db: Session = Depends(get_db_session),
                                      adoc_id: int) -> List[int]:
    # TODO Flo: only if the user has access? What to return?
    return crud_bbox_anno.remove_by_adoc(db=db, id=adoc_id)


@router.get("/{adoc_id}/span_groups", tags=tags,
            response_model=List[SpanGroupRead],
            summary="Returns all SpanGroups in the AnnotationDocument",
            description="Returns all SpanGroups in the AnnotationDocument with the given ID if it exists")
async def get_all_span_groups(*,
                              db: Session = Depends(get_db_session),
                              adoc_id: int,
                              skip_limit: Dict[str, str] = Depends(skip_limit_params)) -> List[SpanGroupRead]:
    # TODO Flo: only if the user has access?
    return [SpanGroupRead.from_orm(group)
            for group in crud_span_group.read_by_adoc(db=db, adoc_id=adoc_id, **skip_limit)]
