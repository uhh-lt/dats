from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from api.dependencies import get_db_session
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataRead, SourceDocumentMetadataCreate, SourceDocumentMetadataUpdate

router = APIRouter(prefix="/metadata")
tags = ["metadata"]


@router.put("", tags=tags,
            response_model=Optional[SourceDocumentMetadataRead],
            summary="Creates new Metadata",
            description="Creates a new Metadata and returns it with the generated ID.")
async def create_new_metadata(*,
                          db: Session = Depends(get_db_session),
                          metadata: SourceDocumentMetadataCreate) -> Optional[SourceDocumentMetadataRead]:
    db_metadata = crud_sdoc_meta.create(db=db, create_dto=metadata)
    return SourceDocumentMetadataRead.from_orm(db_metadata)


@router.get("/{metadata_id}", tags=tags,
            response_model=Optional[SourceDocumentMetadataRead],
            summary="Returns the Metadata",
            description="Returns the Metadata with the given ID.")
async def get_by_id(*,
                    db: Session = Depends(get_db_session),
                    metadata_id: int) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc_meta.read(db=db, id=metadata_id)
    return SourceDocumentMetadataRead.from_orm(db_obj)


@router.patch("/{metadata_id}", tags=tags,
              response_model=SourceDocumentMetadataUpdate,
              summary="Updates the Metadata",
              description="Updates the Metadata with the given ID.")
async def update_by_id(*,
                       db: Session = Depends(get_db_session),
                       metadata_id: int,
                       metadata: SourceDocumentMetadataUpdate) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc_meta.update(db=db, id=metadata_id, update_dto=metadata)
    return SourceDocumentMetadataRead.from_orm(db_obj)


@router.delete("/{metadata_id}", tags=tags,
               response_model=Optional[SourceDocumentMetadataRead],
               summary="Deletes the Metadata",
               description="Deletes the Metadata with the given ID.")
async def delete_by_id(*,
                       db: Session = Depends(get_db_session),
                       metadata_id: int) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc_meta.remove(db=db, id=metadata_id)
    return SourceDocumentMetadataRead.from_orm(db_obj)
