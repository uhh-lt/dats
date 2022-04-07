from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.dto.annotation_document import AnnotationDocumentRead, AnnotationDocumentCreate
from app.core.data.dto.span_annotation import SpanAnnotationRead
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/adoc")
tags = ["annotationDocument"]

session = SQLService().get_db_session


@router.put("", tags=tags,
            response_model=Optional[AnnotationDocumentRead],
            summary="Creates an AnnotationDocument",
            description="Creates an AnnotationDocument")
async def create(*,
                 db: Session = Depends(session),
                 adoc: AnnotationDocumentCreate) -> Optional[AnnotationDocumentRead]:
    return AnnotationDocumentRead.from_orm(crud_adoc.create(db=db, create_dto=adoc))


@router.get("/{adoc_id}", tags=tags,
            response_model=Optional[AnnotationDocumentRead],
            summary="Returns the AnnotationDocument",
            description="Returns the AnnotationDocument with the given ID if it exists")
async def get_by_adoc_id(*,
                         db: Session = Depends(session),
                         adoc_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_adoc.read(db=db, id=adoc_id)
    return AnnotationDocumentRead.from_orm(db_obj)


@router.delete("/{adoc_id}", tags=tags,
               response_model=Optional[AnnotationDocumentRead],
               summary="Removes the AnnotationDocument",
               description="Removes the AnnotationDocument with the given ID if it exists")
async def delete_by_adoc_id(*,
                            db: Session = Depends(session),
                            adoc_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_adoc.remove(db=db, id=adoc_id)
    return AnnotationDocumentRead.from_orm(db_obj)


@router.get("/{adoc_id}/span_annotations", tags=tags,
            response_model=List[SpanAnnotationRead],
            summary="Returns all SpanAnnotations in the AnnotationDocument",
            description="Returns all SpanAnnotations in the AnnotationDocument with the given ID if it exists")
async def get_all_annotations(*,
                              db: Session = Depends(session),
                              adoc_id: int) -> List[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    return [SpanAnnotationRead.from_orm(span) for span in crud_adoc.read(db=db, id=adoc_id).span_annotations]


@router.delete("/{adoc_id}/span_annotations", tags=tags,
               response_model=Optional[AnnotationDocumentRead],
               summary="Removes all SpanAnnotations in the AnnotationDocument",
               description="Removes all SpanAnnotations in the AnnotationDocument with the given ID if it exists")
async def delete_all_annotations(*,
                                 db: Session = Depends(session),
                                 adoc_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access? What to return? Only delete spans from the current user!!!!
    return AnnotationDocumentRead.from_orm(crud_adoc.remove_all_span_annotations(db=db, id=adoc_id))
