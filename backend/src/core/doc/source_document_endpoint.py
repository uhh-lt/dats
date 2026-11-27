from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataRead
from core.doc.source_document_dto import (
    SourceDocumentRead,
    SourceDocumentUpdate,
    SourceDocumentUrls,
)
from core.doc.source_document_service import SourceDocumentService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/source-documents", tags=["sourceDocument", "mcp"])


# --- read operations


@router.get(
    "/count",
    response_model=int,
    summary="Returns the number of SourceDocuments of the Project, optionally only those with the given status or with a value for the given date metadata",
)
def count(
    *,
    db: DBSession,
    project_id: int,
    status: SDocStatus | None = None,
    date_metadata_id: int | None = None,
) -> int:
    return crud_sdoc.count_by_project(
        db=db, project_id=project_id, status=status, date_metadata_id=date_metadata_id
    )


@router.get(
    "",
    response_model=list[SourceDocumentRead],
    summary="Returns the SourceDocument of the Project with the given filename: a list of one, or an empty list",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
    filename: str,
    only_finished: bool = True,
) -> list[SourceDocumentRead]:
    sdoc = crud_sdoc.read_by_filename(
        db=db, project_id=project_id, only_finished=only_finished, filename=filename
    )
    if sdoc is None:
        return []
    return [SourceDocumentRead.model_validate(sdoc)]


@router.get(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Returns the SourceDocument with the given ID if it exists",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    sdoc_id: int,
    only_if_finished: bool = True,
) -> SourceDocumentRead:
    if not only_if_finished:
        crud_sdoc.read_status(
            db=db,
            project_id=project_id,
            sdoc_id=sdoc_id,
            raise_error_on_unfinished=True,
        )

    return SourceDocumentRead.model_validate(
        crud_sdoc.read(db=db, project_id=project_id, id=sdoc_id)
    )


@router.get(
    "/{sdoc_id}/data",
    response_model=SourceDocumentDataRead,
    summary="Returns the SourceDocumentData of the SourceDocument with the given ID if it exists",
)
def get_by_id_with_data(
    *,
    db: DBSession,
    project_id: int,
    sdoc_id: int,
    only_if_finished: bool = True,
) -> SourceDocumentDataRead:
    if not only_if_finished:
        crud_sdoc.read_status(
            db=db,
            project_id=project_id,
            sdoc_id=sdoc_id,
            raise_error_on_unfinished=True,
        )

    sdoc_data = crud_sdoc_data.read(db=db, project_id=project_id, id=sdoc_id)
    return SourceDocumentDataRead.model_validate(sdoc_data)


@router.get(
    "/{sdoc_id}/same-folder",
    response_model=list[int],
    summary="Returns the ids of SourceDocuments in the same folder as the SourceDocument with the given id.",
)
def get_same_folder_sdocs(
    *,
    db: DBSession,
    project_id: int,
    sdoc_id: int,
) -> list[int]:
    sdoc = crud_sdoc.read(db=db, project_id=project_id, id=sdoc_id)
    same_folder_sdocs = sdoc.folder.source_documents
    doctype_order = {"text": 0, "img": 1, "audio": 2, "video": 3}
    same_folder_sdocs.sort(key=lambda s: (doctype_order.get(s.doctype, 99), s.filename))
    return [s.id for s in same_folder_sdocs]


@router.get(
    "/{sdoc_id}/urls",
    response_model=SourceDocumentUrls,
    summary="Returns the URLs of the files of the SourceDocument with the given ID (relative to /content/).",
)
def get_urls(
    *,
    db: DBSession,
    project_id: int,
    sdoc_id: int,
) -> SourceDocumentUrls:
    return SourceDocumentService().read_urls(
        db=db, project_id=project_id, sdoc_id=sdoc_id
    )


@router.get(
    "/{sdoc_id}/annotators",
    response_model=list[int],
    summary="Returns IDs of users that annotated that SourceDocument.",
)
def get_annotators(
    *,
    db: DBSession,
    project_id: int,
    sdoc_id: int,
) -> list[int]:
    sdoc = crud_sdoc.read(db=db, project_id=project_id, id=sdoc_id)
    return [adoc.user_id for adoc in sdoc.annotation_documents]


# --- update operations


@router.patch(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Updates the SourceDocument with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    sdoc_id: int,
    sdoc: SourceDocumentUpdate,
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentRead:
    db_obj = crud_sdoc.update(db=db, project_id=project_id, id=sdoc_id, update_dto=sdoc)
    result = SourceDocumentRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.SDOC_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/bulk",
    response_model=list[SourceDocumentRead],
    summary="Removes all SourceDocuments with the given IDs if they exist",
)
def delete_bulk(
    *,
    db: DBSession,
    project_id: int,
    sdoc_ids: list[int],
    ws: WebsocketEmitter = Depends(),
) -> list[SourceDocumentRead]:
    result = SourceDocumentService().delete_multi(
        db=db, project_id=project_id, sdoc_ids=sdoc_ids
    )
    if result.sdocs:
        ws.emit_to_project(
            DATSEvent.SDOC_DELETED_BATCH, result.sdocs, project_id=project_id
        )
    if result.folders:
        ws.emit_to_project(
            DATSEvent.FOLDER_DELETED_BATCH, result.folders, project_id=project_id
        )
    return result.sdocs


@router.delete(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Removes the SourceDocument with the given ID if it exists",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    sdoc_id: int,
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentRead:
    result = SourceDocumentService().delete_multi(
        db=db, project_id=project_id, sdoc_ids=[sdoc_id]
    )
    sdoc = result.sdocs[0]
    ws.emit_to_project(DATSEvent.SDOC_DELETED, sdoc, project_id=project_id)
    for folder in result.folders:
        ws.emit_to_project(DATSEvent.FOLDER_DELETED, folder, project_id=project_id)
    return sdoc
