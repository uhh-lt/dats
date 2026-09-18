from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.doc.source_document_crud import crud_sdoc
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataBulkUpdate,
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
)
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/sdocmeta",
    dependencies=[Depends(get_current_user)],
    tags=["sdocMetadata", "mcp"],
)


# --- read operations


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


# --- update operations


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
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT_METADATA, metadata_id)

    db_obj = crud_sdoc_meta.update(db=db, metadata_id=metadata_id, update_dto=metadata)
    result = SourceDocumentMetadataRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.SDOC_METADATA_UPDATED,
        result,
        project_id=db_obj.get_project_id(),
    )
    return result


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
    ws: WebsocketEmitter = Depends(),
) -> list[SourceDocumentMetadataRead]:
    authz_user.assert_in_same_project_as_many(
        Crud.SOURCE_DOCUMENT_METADATA, [m.id for m in metadatas]
    )
    db_objs = crud_sdoc_meta.update_bulk(db=db, update_dtos=metadatas)
    results = [SourceDocumentMetadataRead.model_validate(db_obj) for db_obj in db_objs]
    if results:
        ws.emit_to_project(
            DATSEvent.SDOC_METADATA_UPDATED_BATCH,
            results,
            project_id=db_objs[0].get_project_id(),
        )
    return results


# --- delete operations


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
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT_METADATA, metadata_id)
    metadata = crud_sdoc_meta.read(db=db, id=metadata_id)
    project_id = metadata.get_project_id()
    db_obj = crud_sdoc_meta.delete(db=db, id=metadata_id)
    result = SourceDocumentMetadataRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.SDOC_METADATA_DELETED, result, project_id=project_id)
    return result
