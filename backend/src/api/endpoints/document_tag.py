from typing import Optional

from fastapi import APIRouter, Depends
from requests import Session

from api.dependencies import get_db_session
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.document_tag import DocumentTagRead, DocumentTagUpdate, DocumentTagCreate, \
    SourceDocumentDocumentTagMultiLink
from app.core.data.dto.memo import MemoCreate, MemoInDB, MemoRead, AttachedObjectType

router = APIRouter(prefix="/doctag")
tags = ["documentTag"]


@router.put("", tags=tags,
            response_model=Optional[DocumentTagRead],
            summary="Creates a new DocumentTag",
            description="Creates a new DocumentTag and returns it with the generated ID.")
async def create_new_doc_tag(*,
                             db: Session = Depends(get_db_session),
                             doc_tag: DocumentTagCreate) -> Optional[DocumentTagRead]:
    db_obj = crud_document_tag.create(db=db, create_dto=doc_tag)
    return DocumentTagRead.from_orm(db_obj)


@router.patch("/bulk/", tags=tags,
              response_model=int,
              summary="Applies DocumentTags to the SourceDocuments",
              description="Adds and removes DocumentTags to and from the SourceDocuments so that all SourceDocuments "
                          "have the specified DocumentTags")
async def bulk_tags(*,
                    db: Session = Depends(get_db_session),
                    multi_link: SourceDocumentDocumentTagMultiLink) -> int:
    # TODO Flo: only if the user has access?
    return crud_document_tag.set_multiple_document_tags(db=db,
                                                        sdoc_ids=multi_link.source_document_ids,
                                                        tag_ids=multi_link.document_tag_ids)


@router.get("/{tag_id}", tags=tags,
            response_model=Optional[DocumentTagRead],
            summary="Returns the DocumentTag",
            description="Returns the DocumentTag with the given ID.")
async def get_by_id(*,
                    db: Session = Depends(get_db_session),
                    tag_id: int) -> Optional[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_document_tag.read(db=db, id=tag_id)
    return DocumentTagRead.from_orm(db_obj)


@router.patch("/{tag_id}", tags=tags,
              response_model=Optional[DocumentTagRead],
              summary="Updates the DocumentTag",
              description="Updates the DocumentTag with the given ID.")
async def update_by_id(*,
                       db: Session = Depends(get_db_session),
                       tag_id: int,
                       doc_tag: DocumentTagUpdate) -> Optional[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_document_tag.update(db=db, id=tag_id, update_dto=doc_tag)
    return DocumentTagRead.from_orm(db_obj)


@router.delete("/{tag_id}", tags=tags,
               response_model=Optional[DocumentTagRead],
               summary="Deletes the DocumentTag",
               description="Deletes the DocumentTag with the given ID.")
async def delete_by_id(*,
                       db: Session = Depends(get_db_session),
                       tag_id: int) -> Optional[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_document_tag.remove(db=db, id=tag_id)
    return DocumentTagRead.from_orm(db_obj)


@router.put("/{tag_id}/memo", tags=tags,
            response_model=Optional[MemoRead],
            summary="Adds a Memo to the DocumentTag",
            description="Adds a Memo to the DocumentTag with the given ID if it exists")
async def add_memo(*,
                   db: Session = Depends(get_db_session),
                   tag_id: int,
                   memo: MemoCreate) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_document_tag(db=db, doc_tag_id=tag_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                    attached_object_id=tag_id,
                    attached_object_type=AttachedObjectType.document_tag)


@router.get("/{tag_id}/memo", tags=tags,
            response_model=Optional[MemoRead],
            summary="Returns the Memo attached to the DocumentTag",
            description="Returns the Memo attached to the DocumentTag with the given ID if it exists.")
async def get_memo(*,
                   db: Session = Depends(get_db_session),
                   tag_id: int) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    doc_tag_db_obj = crud_document_tag.read(db=db, id=tag_id)
    memo_as_in_db_dto = MemoInDB.from_orm(doc_tag_db_obj.object_handle.attached_memo)
    return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                    attached_object_id=tag_id,
                    attached_object_type=AttachedObjectType.document_tag)
