from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
    SourceDocumentMetadataUpdateBulk,
)
from core.metadata.source_document_metadata_service import (
    SourceDocumentMetadataService,
)
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/source-document-metadata", tags=["sdocMetadata", "mcp"])


# --- read operations


@router.get(
    "",
    response_model=list[SourceDocumentMetadataRead],
    summary="Returns the SourceDocumentMetadata of the SourceDocument, optionally only the one with the given key",
)
def get_by_sdoc(
    *,
    db: DBSession,
    project_id: int,
    sdoc_id: int,
    key: str | None = None,
) -> list[SourceDocumentMetadataRead]:
    if key is None:
        db_objs = crud_sdoc_meta.read_by_sdoc(
            db=db, project_id=project_id, sdoc_id=sdoc_id
        )
    else:
        db_objs = [
            sdoc_metadata
            for _, sdoc_metadata in crud_sdoc_meta.read_by_sdoc_and_keys(
                db=db, project_id=project_id, sdoc_id=sdoc_id, keys=[key]
            )
        ]
    return [SourceDocumentMetadataRead.model_validate(meta) for meta in db_objs]


@router.get(
    "/{sdoc_metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Returns the SourceDocumentMetadata with the given ID if it exists",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    sdoc_metadata_id: int,
) -> SourceDocumentMetadataRead:
    db_obj = crud_sdoc_meta.read(db=db, project_id=project_id, id=sdoc_metadata_id)
    return SourceDocumentMetadataRead.model_validate(db_obj)


# --- update operations


@router.patch(
    "/bulk",
    response_model=list[SourceDocumentMetadataRead],
    summary="Updates multiple metadata objects at once.",
)
def update_bulk(
    *,
    db: DBSession,
    project_id: int,
    metadatas: list[SourceDocumentMetadataUpdateBulk],
    ws: WebsocketEmitter = Depends(),
) -> list[SourceDocumentMetadataRead]:
    results = SourceDocumentMetadataService().update_multi(
        db=db, project_id=project_id, update_dtos=metadatas
    )
    if results:
        ws.emit_to_project(
            DATSEvent.SDOC_METADATA_UPDATED_BATCH, results, project_id=project_id
        )
    return results


@router.patch(
    "/{sdoc_metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Updates the Metadata with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    sdoc_metadata_id: int,
    metadata: SourceDocumentMetadataUpdate,
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentMetadataRead:
    result = SourceDocumentMetadataService().update(
        db=db, project_id=project_id, id=sdoc_metadata_id, update_dto=metadata
    )
    ws.emit_to_project(DATSEvent.SDOC_METADATA_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{sdoc_metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Deletes the Metadata with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    sdoc_metadata_id: int,
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentMetadataRead:
    result = SourceDocumentMetadataService().delete(
        db=db, project_id=project_id, id=sdoc_metadata_id
    )
    ws.emit_to_project(DATSEvent.SDOC_METADATA_DELETED, result, project_id=project_id)
    return result
