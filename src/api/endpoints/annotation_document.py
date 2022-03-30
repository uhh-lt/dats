from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.span_annotation import SpanAnnotationRead
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/adoc")
tags = ["annotationDocument"]


@router.get("/{adoc_id}", tags=tags,
            response_model=Optional[AnnotationDocumentRead],
            summary="Returns the AnnotationDocument",
            description="Returns the AnnotationDocument with the given ID if it exists")
async def get_by_adoc_id(*,
                         db: Session = Depends(SQLService().get_db_session),
                         adoc_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_adoc.read(db=db, id=adoc_id)
    return AnnotationDocumentRead.from_orm(db_obj)


@router.delete("/{adoc_id}", tags=tags,
               response_model=Optional[AnnotationDocumentRead],
               summary="Removes the AnnotationDocument",
               description="Removes the AnnotationDocument with the given ID if it exists")
async def delete_by_adoc_id(*,
                            db: Session = Depends(SQLService().get_db_session),
                            adoc_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_adoc.remove(db=db, id=adoc_id)
    return AnnotationDocumentRead.from_orm(db_obj)


# TODO Flo: creating a new adoc is done implicitly when creating the first annotation
# @router.put("/{adoc_id}", tags=tags,
#             response_model=Optional[DocumentRead],
#             description="Returns the AnnotationDocument with the given ID if it exists")
# async def create(adoc_id: int
#                 ) -> Optional[DocumentRead]:
#     raise NotImplementedError()


# TODO Flo: updating the adoc is done implicitly when adding annotations.
#  However we might need it for adoc metadata like finished state
# @router.patch("/{adoc_id}", tags=tags,
#               response_model=Optional[DocumentRead],
#               description="Returns the AnnotationDocument with the given ID if it exists")
# async def update(adoc_id: int
#                 ) -> Optional[DocumentRead]:
#     raise NotImplementedError()

@router.put("/{adoc_id}/span_annotation", tags=tags,
            response_model=Optional[AnnotationDocumentRead],
            summary="Adds a SpanAnnotation to the AnnotationDocument",
            description="Adds a SpanAnnotation to the AnnotationDocument with the given ID if it exists")
async def add_span_annotations(*,
                               db: Session = Depends(SQLService().get_db_session),
                               adoc_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.get("/{adoc_id}/annotations", tags=tags,
            response_model=List[SpanAnnotationRead],
            summary="Returns all Annotations in the AnnotationDocument",
            description="Returns all Annotations in the AnnotationDocument with the given ID if it exists")
async def get_all_annotations(*,
                              db: Session = Depends(SQLService().get_db_session),
                              adoc_id: int) -> List[SpanAnnotationRead]:
    # TODO Flo: only if the user has access?
    return [SpanAnnotationRead.from_orm(span) for span in crud_adoc.read(db=db, id=adoc_id).span_annotations]


@router.delete("/{adoc_id}/annotations", tags=tags,
               response_model=Optional[AnnotationDocumentRead],
               summary="Removes all Annotations in the AnnotationDocument",
               description="Removes all Annotations in the AnnotationDocument with the given ID if it exists")
async def delete_all_annotations(*,
                                 db: Session = Depends(SQLService().get_db_session),
                                 adoc_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()

# @router.put("/{adoc_id}/memo", tags=tags,
#             response_model=UserRead,
#             summary="Adds a Memo to the AnnotationDocument",
#             description="Adds a Memo to the AnnotationDocument with the given ID if it exists")
# async def add_memo(user: UserRead = Depends(current_user)) -> Optional[UserRead]:
#     # TODO Flo: only if the user has access?
#     raise NotImplementedError()
#
#
# @router.get("/{adoc_id}/memo", tags=tags,
#             response_model=UserRead,
#             summary="Returns the Memo attached to the AnnotationDocument",
#             description="Returns the Memo attached to the AnnotationDocument with the given ID if it exists")
# async def get_memo(user: UserRead = Depends(current_user)) -> Optional[UserRead]:
#     # TODO Flo: only if the user has access?
#     raise NotImplementedError()
