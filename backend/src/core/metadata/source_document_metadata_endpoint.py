from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.auth.validation import Validate
from core.doc.source_document_crud import crud_sdoc
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataBulkUpdate,
    SourceDocumentMetadataCreate,
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
)

router = APIRouter(
    prefix="/sdocmeta", dependencies=[Depends(get_current_user)], tags=["sdocMetadata"]
)


@router.put(
    "",
    response_model=SourceDocumentMetadataRead,
    summary="Creates a new Metadata and returns it with the generated ID.",
)
def create_new_metadata(
    *,
    db: Session = Depends(get_db_session),
    metadata: SourceDocumentMetadataCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(
        Crud.PROJECT_METADATA, metadata.project_metadata_id
    )
    authz_user.assert_in_same_project_as(
        Crud.SOURCE_DOCUMENT, metadata.source_document_id
    )
    validate.validate_objects_in_same_project(
        [
            (Crud.SOURCE_DOCUMENT, metadata.source_document_id),
            (Crud.PROJECT_METADATA, metadata.project_metadata_id),
        ]
    )

    db_metadata = crud_sdoc_meta.create(db=db, create_dto=metadata)
    return SourceDocumentMetadataRead.model_validate(db_metadata)


@router.get(
    "/{metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Returns the Metadata with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT_METADATA, metadata_id)

    db_obj = crud_sdoc_meta.read(db=db, id=metadata_id)
    return SourceDocumentMetadataRead.model_validate(db_obj)


@router.get(
    "/sdoc/{sdoc_id}",
    response_model=list[SourceDocumentMetadataRead],
    summary="Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists",
)
def get_by_sdoc(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[SourceDocumentMetadataRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [
        SourceDocumentMetadataRead.model_validate(meta)
        for meta in sdoc_db_obj.metadata_
    ]


@router.get(
    "/sdoc/{sdoc_id}/metadata/{metadata_key}",
    response_model=SourceDocumentMetadataRead,
    summary="Returns the SourceDocumentMetadata with the given Key if it exists.",
)
def get_by_sdoc_and_key(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    metadata_key: str,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    metadata_db_obj = crud_sdoc_meta.read_by_sdoc_and_key(
        db=db, sdoc_id=sdoc_id, key=metadata_key
    )
    return SourceDocumentMetadataRead.model_validate(metadata_db_obj)


@router.patch(
    "/{metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Updates the Metadata with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    metadata: SourceDocumentMetadataUpdate,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT_METADATA, metadata_id)

    db_obj = crud_sdoc_meta.update(db=db, metadata_id=metadata_id, update_dto=metadata)
    return SourceDocumentMetadataRead.model_validate(db_obj)


@router.patch(
    "/bulk/update",
    response_model=list[SourceDocumentMetadataRead],
    summary="Updates multiple metadata objects at once.",
)
def update_bulk(
    *,
    db: Session = Depends(get_db_session),
    metadatas: list[SourceDocumentMetadataBulkUpdate],
    authz_user: AuthzUser = Depends(),
) -> list[SourceDocumentMetadataRead]:
    authz_user.assert_in_same_project_as_many(
        Crud.SOURCE_DOCUMENT_METADATA, [m.id for m in metadatas]
    )
    db_objs = crud_sdoc_meta.update_bulk(db=db, update_dtos=metadatas)
    return [SourceDocumentMetadataRead.model_validate(db_obj) for db_obj in db_objs]


@router.delete(
    "/{metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Deletes the Metadata with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT_METADATA, metadata_id)
    db_obj = crud_sdoc_meta.delete(db=db, id=metadata_id)
    return SourceDocumentMetadataRead.model_validate(db_obj)
