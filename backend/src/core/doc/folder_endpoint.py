from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.doc_type_enum import DocType
from common.project_router import project_router
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderRead, FolderUpdate, FolderUpdateBulk
from core.doc.folder_enum import FolderType
from core.doc.folder_exceptions import FolderNotSdocFolderError
from core.doc.folder_service import FolderService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/folders", tags=["folder", "mcp"])


# --- create operations


@router.put(
    "",
    response_model=FolderRead,
    summary="Creates a new Folder and returns it with the generated ID.",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    folder: FolderCreate,
    ws: WebsocketEmitter = Depends(),
) -> FolderRead:
    db_obj = crud_folder.create(db=db, project_id=project_id, create_dto=folder)
    result = FolderRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.FOLDER_CREATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "",
    response_model=list[FolderRead],
    summary="Returns the folders of the project, optionally only those of the folder_type",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
    folder_type: FolderType | None = None,
) -> list[FolderRead]:
    if folder_type is None:
        folders = crud_folder.read_by_project(db=db, project_id=project_id)
    else:
        folders = crud_folder.read_by_project_and_type(
            db=db, project_id=project_id, folder_type=folder_type
        )
    return [FolderRead.model_validate(folder) for folder in folders]


@router.get(
    "/{folder_id}",
    response_model=FolderRead,
    summary="Returns the Folder with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    folder_id: int,
) -> FolderRead:
    folder = crud_folder.read(db=db, project_id=project_id, id=folder_id)
    return FolderRead.model_validate(folder)


@router.get(
    "/{folder_id}/source-documents",
    response_model=dict[DocType, list[int]],
    summary="Returns lists of source document ids per doctype in the specified sdoc folder",
)
def get_sdoc_ids_in_folder_by_doctype(
    *,
    db: DBSession,
    project_id: int,
    folder_id: int,
) -> dict[DocType, list[int]]:
    folder = crud_folder.read(db=db, project_id=project_id, id=folder_id)
    if folder.folder_type != FolderType.SDOC_FOLDER:
        raise FolderNotSdocFolderError(folder_id=folder_id)
    result: dict[DocType, list[int]] = {dt: [] for dt in DocType}
    for sdoc in folder.source_documents:
        result[DocType(sdoc.doctype)].append(sdoc.id)
    return result


# --- update operations


@router.patch(
    "/bulk",
    response_model=list[FolderRead],
    summary="Updates the Folders with the given IDs.",
)
def update_bulk(
    *,
    db: DBSession,
    project_id: int,
    folder_updates: list[FolderUpdateBulk],
    ws: WebsocketEmitter = Depends(),
) -> list[FolderRead]:
    db_objs = crud_folder.update_multi(
        db=db,
        project_id=project_id,
        ids=[u.folder_id for u in folder_updates],
        update_dtos=[
            FolderUpdate.model_validate(
                u.model_dump(exclude_unset=True, exclude={"folder_id"})
            )
            for u in folder_updates
        ],
    )
    results = [FolderRead.model_validate(folder) for folder in db_objs]
    if results:
        ws.emit_to_project(
            DATSEvent.FOLDER_UPDATED_BATCH, results, project_id=project_id
        )
    return results


@router.patch(
    "/{folder_id}",
    response_model=FolderRead,
    summary="Updates the Folder with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    folder_id: int,
    folder_update: FolderUpdate,
    ws: WebsocketEmitter = Depends(),
) -> FolderRead:
    db_obj = crud_folder.update(
        db=db, project_id=project_id, id=folder_id, update_dto=folder_update
    )
    result = FolderRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.FOLDER_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{folder_id}",
    response_model=FolderRead,
    summary="Deletes the Folder with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    folder_id: int,
    ws: WebsocketEmitter = Depends(),
) -> FolderRead:
    result = FolderService().delete_folder(
        db=db, project_id=project_id, folder_id=folder_id
    )
    ws.emit_to_project(DATSEvent.FOLDER_DELETED, result, project_id=project_id)
    return result
