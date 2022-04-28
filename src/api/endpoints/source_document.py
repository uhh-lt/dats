from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import MemoInDB, MemoCreate, MemoRead, AttachedObjectType
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataUpdate, SourceDocumentMetadataRead

router = APIRouter(prefix="/sdoc")
tags = ["sourceDocument"]


@router.get("/{sdoc_id}", tags=tags,
            response_model=Optional[SourceDocumentRead],
            summary="Returns the SourceDocument",
            description="Returns the SourceDocument with the given ID if it exists")
async def get_by_id(*,
                    db: Session = Depends(get_db_session),
                    sdoc_id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    #  What about the content?!
    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return SourceDocumentRead.from_orm(db_obj)


@router.delete("/{sdoc_id}", tags=tags,
               response_model=Optional[SourceDocumentRead],
               summary="Removes the SourceDocument",
               description="Removes the SourceDocument with the given ID if it exists")
async def delete_by_id(*,
                       db: Session = Depends(get_db_session),
                       sdoc_id: int) -> SourceDocumentRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc.remove(db=db, id=sdoc_id)
    return SourceDocumentRead.from_orm(db_obj)


@router.get("/{sdoc_id}/metadata", tags=tags,
            response_model=List[SourceDocumentMetadataRead],
            summary="Returns all SourceDocumentMetadata",
            description="Returns all SourceDocumentMetadata with the given ID if it exists")
async def get_all_metadata(*,
                           db: Session = Depends(get_db_session),
                           sdoc_id: int) -> List[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [SourceDocumentMetadataRead.from_orm(meta) for meta in sdoc_db_obj.metadata_]


@router.patch("/{sdoc_id}/metadata/{metadata_id}", tags=tags,
              response_model=Optional[SourceDocumentMetadataRead],
              summary="Updates the SourceDocumentMetadata",
              description="Updates the SourceDocumentMetadata with the given ID if it exists.")
async def update_metadata_by_id(*,
                                db: Session = Depends(get_db_session),
                                sdoc_id: int,
                                metadata_id: int,
                                metadata: SourceDocumentMetadataUpdate) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    metadata_db_obj = crud_sdoc_meta.update(db=db, id=metadata_id, update_dto=metadata)
    return SourceDocumentMetadataRead.from_orm(metadata_db_obj)


@router.get("/{sdoc_id}/adoc/{user_id}", tags=tags,
            response_model=Optional[AnnotationDocumentRead],
            summary="Returns the AnnotationDocument for the SourceDocument of the User",
            description="Returns the AnnotationDocument for the SourceDocument of the User.")
async def get_adoc_of_user(*,
                           db: Session = Depends(get_db_session),
                           sdoc_id: int,
                           user_id: int) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    return AnnotationDocumentRead.from_orm(crud_adoc.read_by_sdoc_and_user(db=db, sdoc_id=sdoc_id, user_id=user_id))


@router.get("/{sdoc_id}/adoc", tags=tags,
            response_model=List[AnnotationDocumentRead],
            summary="Returns all AnnotationDocuments for the SourceDocument",
            description="Returns all AnnotationDocuments for the SourceDocument.")
async def get_all_adocs(*,
                        db: Session = Depends(get_db_session),
                        sdoc_id: int) -> List[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    return [AnnotationDocumentRead.from_orm(adoc) for adoc in crud_sdoc.read(db=db, id=sdoc_id).annotation_documents]


@router.delete("/{sdoc_id}/adoc", tags=tags,
               response_model=List[int],
               summary="Removes all AnnotationDocuments for the SourceDocument",
               description="Removes all AnnotationDocuments for the SourceDocument.")
async def remove_all_adocs(*,
                           db: Session = Depends(get_db_session),
                           sdoc_id: int) -> List[int]:
    # TODO Flo: only if the user has access?
    return crud_adoc.remove_by_sdoc(db=db, sdoc_id=sdoc_id)


@router.get("/{sdoc_id}/tags", tags=tags,
            response_model=List[DocumentTagRead],
            summary="Returns all DocumentTags linked with the SourceDocument",
            description="Returns all DocumentTags linked with the SourceDocument.")
async def get_all_tags(*,
                       db: Session = Depends(get_db_session),
                       sdoc_id: int) -> List[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [DocumentTagRead.from_orm(doc_tag_db_obj) for doc_tag_db_obj in sdoc_db_obj.document_tags]


@router.delete("/{sdoc_id}/tags", tags=tags,
               response_model=Optional[SourceDocumentRead],
               summary="Unlinks all DocumentTags with the SourceDocument",
               description="Unlinks all DocumentTags of the SourceDocument.")
async def unlinks_all_tags(*,
                           db: Session = Depends(get_db_session),
                           sdoc_id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.unlink_all_document_tags(db=db, id=sdoc_id)
    return SourceDocumentRead.from_orm(sdoc_db_obj)


@router.patch("/{sdoc_id}/tag/{tag_id}", tags=tags,
              response_model=Optional[SourceDocumentRead],
              summary="Links a DocumentTag with the SourceDocument",
              description="Links a DocumentTag with the SourceDocument with the given ID if it exists")
async def link_tag(*,
                   db: Session = Depends(get_db_session),
                   sdoc_id: int,
                   tag_id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.link_document_tag(db=db, sdoc_id=sdoc_id, tag_id=tag_id)
    return SourceDocumentRead.from_orm(sdoc_db_obj)


@router.delete("/{sdoc_id}/tag/{tag_id}", tags=tags,
               response_model=Optional[SourceDocumentRead],
               summary="Unlinks the DocumentTag from the SourceDocument",
               description="Unlinks the DocumentTags from the SourceDocument.")
async def unlink_tag(*,
                     db: Session = Depends(get_db_session),
                     sdoc_id: int,
                     tag_id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.unlink_document_tag(db=db, sdoc_id=sdoc_id, tag_id=tag_id)
    return SourceDocumentRead.from_orm(sdoc_db_obj)


@router.put("/{sdoc_id}/memo", tags=tags,
            response_model=Optional[MemoRead],
            summary="Adds a Memo to the SourceDocument",
            description="Adds a Memo to the SourceDocument with the given ID if it exists")
async def add_memo(*,
                   db: Session = Depends(get_db_session),
                   sdoc_id: int,
                   memo: MemoCreate) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_sdoc(db=db, sdoc_id=sdoc_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                    attached_object_id=sdoc_id,
                    attached_object_type=AttachedObjectType.source_document)


@router.get("/{sdoc_id}/memo", tags=tags,
            response_model=Optional[MemoRead],
            summary="Returns the Memo attached to the SourceDocument",
            description="Returns the Memo attached to the SourceDocument with the given ID if it exists.")
async def get_memo(*,
                   db: Session = Depends(get_db_session),
                   sdoc_id: int) -> Optional[MemoRead]:
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    memo_as_in_db_dto = MemoInDB.from_orm(sdoc_db_obj.object_handle.attached_memo)
    return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                    attached_object_id=sdoc_id,
                    attached_object_type=AttachedObjectType.source_document)
