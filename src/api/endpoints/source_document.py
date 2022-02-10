from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/sdoc")
tags = ["sourceDocument"]


@router.get("/{id}", tags=tags,
            response_model=Optional[SourceDocumentRead],
            summary="Returns the SourceDocument",
            description="Returns the SourceDocument with the given ID if it exists")
async def get_by_id(*,
                    db: Session = Depends(SQLService().get_db_session),
                    id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    #  What about the content?!
    db_obj = crud_sdoc.read(db=db, id=id)
    return SourceDocumentRead.from_orm(db_obj)


@router.delete("/{id}", tags=tags,
               response_model=Optional[SourceDocumentRead],
               summary="Removes the SourceDocument",
               description="Removes the SourceDocument with the given ID if it exists")
async def delete_by_id(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int) -> SourceDocumentRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc.remove(db=db, id=id)
    return SourceDocumentRead.from_orm(db_obj)


@router.get("/{id}/metadata", tags=tags,
            response_model=Optional[SourceDocumentRead],
            summary="Returns the SourceDocumentMetadata",
            description="Returns the SourceDocumentMetadata with the given ID if it exists")
async def get_metadata_by_id(id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.patch("/{id}/metadata", tags=tags,
              response_model=Optional[SourceDocumentRead],
              summary="Updates the SourceDocumentMetadata",
              description="Updates the SourceDocumentMetadata with the given ID if it exists.")
async def update_metadata_by_id(id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.get("/{id}/adoc/{user}", tags=tags,
            response_model=Optional[SourceDocumentRead],
            summary="Returns the AnnotationDocument for the SourceDocument of the User",
            description="Returns the AnnotationDocument for the SourceDocument of the User.")
async def get_adoc_of_user(id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.get("/{id}/adoc", tags=tags,
            response_model=Optional[SourceDocumentRead],
            summary="Returns all AnnotationDocuments for the SourceDocument",
            description="Returns all AnnotationDocuments for the SourceDocument.")
async def get_all_adocs(id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.delete("/{id}/adoc", tags=tags,
               response_model=Optional[SourceDocumentRead],
               summary="Removes all AnnotationDocuments for the SourceDocument",
               description="Removes all AnnotationDocuments for the SourceDocument.")
async def remove_all_adocs(id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.get("/{id}/tags", tags=tags,
            response_model=Optional[SourceDocumentRead],
            summary="Returns all DocumentTags of the SourceDocument",
            description="Returns all DocumentTags of the SourceDocument.")
async def get_all_tags(id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.delete("/{id}/adoc", tags=tags,
               response_model=Optional[SourceDocumentRead],
               summary="Removes all DocumentTags of the SourceDocument",
               description="Removes all DocumentTags of the SourceDocument.")
async def remove_all_tags(id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()
