from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.crud.memo import crud_memo
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import MemoReadSourceDocument, MemoInDB, MemoCreate
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
async def get_metadata_by_id(*,
                             db: Session = Depends(SQLService().get_db_session),
                             id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.patch("/{id}/metadata", tags=tags,
              response_model=Optional[SourceDocumentRead],
              summary="Updates the SourceDocumentMetadata",
              description="Updates the SourceDocumentMetadata with the given ID if it exists.")
async def update_metadata_by_id(*,
                                db: Session = Depends(SQLService().get_db_session),
                                id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.get("/{id}/adoc/{user}", tags=tags,
            response_model=Optional[AnnotationDocumentRead],
            summary="Returns the AnnotationDocument for the SourceDocument of the User",
            description="Returns the AnnotationDocument for the SourceDocument of the User.")
async def get_adoc_of_user(*,
                           db: Session = Depends(SQLService().get_db_session),
                           id: int,
                           user_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.get("/{id}/adoc", tags=tags,
            response_model=List[AnnotationDocumentRead],
            summary="Returns all AnnotationDocuments for the SourceDocument",
            description="Returns all AnnotationDocuments for the SourceDocument.")
async def get_all_adocs(*,
                        db: Session = Depends(SQLService().get_db_session),
                        id: int) -> List[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.delete("/{id}/adoc", tags=tags,
               response_model=List[AnnotationDocumentRead],
               summary="Removes all AnnotationDocuments for the SourceDocument",
               description="Removes all AnnotationDocuments for the SourceDocument.")
async def remove_all_adocs(*,
                           db: Session = Depends(SQLService().get_db_session),
                           id: int) -> List[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.get("/{id}/tags", tags=tags,
            response_model=List[DocumentTagRead],
            summary="Returns all DocumentTags of the SourceDocument",
            description="Returns all DocumentTags of the SourceDocument.")
async def get_all_tags(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int) -> List[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.delete("/{id}/adoc", tags=tags,
               response_model=List[DocumentTagRead],
               summary="Removes all DocumentTags of the SourceDocument",
               description="Removes all DocumentTags of the SourceDocument.")
async def remove_all_tags(*,
                          db: Session = Depends(SQLService().get_db_session),
                          id: int) -> List[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.put("/{sdoc_id}/memo", tags=tags,
            response_model=Optional[MemoReadSourceDocument],
            summary="Adds a Memo to the SourceDocument",
            description="Adds a Memo to the SourceDocument with the given ID if it exists")
async def add_memo(*,
                   db: Session = Depends(SQLService().get_db_session),
                   sdoc_id: int,
                   memo: MemoCreate) -> Optional[MemoReadSourceDocument]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_sdoc(db=db, sdoc_id=sdoc_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    attached_sdoc = db_obj.attached_to.source_document
    return MemoReadSourceDocument(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                                  attached_source_document_id=attached_sdoc.id)


@router.get("/{sdoc_id}/memo", tags=tags,
            response_model=Optional[MemoReadSourceDocument],
            summary="Returns the Memo attached to the SourceDocument",
            description="Returns the Memo attached to the SourceDocument with the given ID if it exists.")
async def get_memo(*,
                   db: Session = Depends(SQLService().get_db_session),
                   sdoc_id: int) -> Optional[MemoReadSourceDocument]:
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    memo_as_in_db_dto = MemoInDB.from_orm(sdoc_db_obj.object_handle.attached_memo)
    return MemoReadSourceDocument(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                                  attached_source_document_id=sdoc_db_obj.id)
