from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from api.util import get_object_memos
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.doc_type import DocType
from app.core.data.dto import ProjectRead
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import MemoInDB, MemoCreate, MemoRead, AttachedObjectType
from app.core.data.dto.source_document import SourceDocumentRead, SourceDocumentContent, SourceDocumentTokens, \
    SourceDocumentKeywords
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataUpdate, SourceDocumentMetadataRead
from app.core.data.repo.repo_service import RepoService
from app.core.search.elasticsearch_service import ElasticSearchService

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
                       sdoc_id: int) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc.remove(db=db, id=sdoc_id)
    return SourceDocumentRead.from_orm(db_obj)


@router.get("/{sdoc_id}/content", tags=tags,
            response_model=Optional[SourceDocumentContent],
            summary="Returns the (textual) content of the SourceDocument",
            description=("Returns the (textual) content of the SourceDocument if it exists. If the SourceDocument is "
                         "not a text file, there is no content but an URL to the file content."))
async def get_content(*,
                      db: Session = Depends(get_db_session),
                      sdoc_id: int) -> Optional[SourceDocumentContent]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    if sdoc_db_obj.doctype == DocType.text:
        return ElasticSearchService().get_sdoc_content_by_sdoc_id(sdoc_id=sdoc_db_obj.id,
                                                                  proj=ProjectRead.from_orm(sdoc_db_obj.project))
    return RepoService().get_sdoc_url(sdoc=SourceDocumentRead.from_orm(sdoc_db_obj))


@router.get("/{sdoc_id}/tokens", tags=tags,
            response_model=Optional[SourceDocumentTokens],
            summary="Returns the textual tokens of the SourceDocument if it is a text document.",
            description="Returns the textual tokens of the SourceDocument if it is a text document.")
async def get_tokens(*,
                     db: Session = Depends(get_db_session),
                     sdoc_id: int,
                     character_offsets: Optional[bool] = Query(title="Include Character Offsets",
                                                               description="If True include the character offsets.",
                                                               default=False)) \
        -> Optional[SourceDocumentTokens]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return ElasticSearchService().get_sdoc_tokens_by_sdoc_id(sdoc_id=sdoc_db_obj.id,
                                                             proj=ProjectRead.from_orm(sdoc_db_obj.project),
                                                             character_offsets=character_offsets)


@router.get("/{sdoc_id}/keywords", tags=tags,
            response_model=Optional[SourceDocumentKeywords],
            summary="Returns the keywords of the SourceDocument if it is a text document.",
            description="Returns the keywords of the SourceDocument if it is a text document.")
async def get_tokens(*,
                     db: Session = Depends(get_db_session),
                     sdoc_id: int) -> Optional[SourceDocumentKeywords]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return ElasticSearchService().get_sdoc_keywords_by_sdoc_id(sdoc_id=sdoc_db_obj.id,
                                                               proj=ProjectRead.from_orm(sdoc_db_obj.project))


@router.get("/{sdoc_id}/url", tags=tags,
            response_model=Optional[str],
            summary="Returns the URL to the original file of the SourceDocument",
            description="Returns the URL to the original file of the SourceDocument with the given ID if it exists.")
async def get_file_url(*,
                       db: Session = Depends(get_db_session),
                       sdoc_id: int,
                       relative: Optional[bool] = True) -> Optional[str]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return RepoService().get_sdoc_url(sdoc=SourceDocumentRead.from_orm(sdoc_db_obj), relative=relative)


@router.get("/{sdoc_id}/metadata", tags=tags,
            response_model=List[SourceDocumentMetadataRead],
            summary="Returns all SourceDocumentMetadata",
            description="Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists")
async def get_all_metadata(*,
                           db: Session = Depends(get_db_session),
                           sdoc_id: int) -> List[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [SourceDocumentMetadataRead.from_orm(meta) for meta in sdoc_db_obj.metadata_]


@router.get("/{sdoc_id}/metadata/{metadata_key}", tags=tags,
            response_model=Optional[SourceDocumentMetadataRead],
            summary="Returns the SourceDocumentMetadata with the given Key",
            description="Returns the SourceDocumentMetadata with the given Key if it exists.")
async def read_metadata_by_key(*,
                               db: Session = Depends(get_db_session),
                               sdoc_id: int,
                               metadata_key: str) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    crud_sdoc.exists(db=db, id=sdoc_id, raise_error=True)
    metadata_db_obj = crud_sdoc_meta.read_by_sdoc_and_key(db=db, sdoc_id=sdoc_id, key=metadata_key)
    return SourceDocumentMetadataRead.from_orm(metadata_db_obj)


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
    crud_sdoc.exists(db=db, id=sdoc_id, raise_error=True)
    metadata_db_obj = crud_sdoc_meta.update(db=db, metadata_id=metadata_id, update_dto=metadata)
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
            response_model=List[MemoRead],
            summary="Returns all Memo attached to the SourceDocument",
            description="Returns all Memo attached to the SourceDocument with the given ID if it exists.")
async def get_memos(*,
                    db: Session = Depends(get_db_session),
                    sdoc_id: int) -> List[MemoRead]:
    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return get_object_memos(db_obj=db_obj)


@router.get("/{sdoc_id}/memo/{user_id}", tags=tags,
            response_model=Optional[MemoRead],
            summary="Returns the Memo attached to the SourceDocument of the User with the given ID",
            description=("Returns the Memo attached to the SourceDocument with the given ID of the User with the"
                         " given ID if it exists."))
async def get_user_memo(*,
                        db: Session = Depends(get_db_session),
                        sdoc_id: int,
                        user_id: int) -> Optional[MemoRead]:
    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return get_object_memos(db_obj=db_obj, user_id=user_id)
