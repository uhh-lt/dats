from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from common.doc_type import DocType
from core.auth.authz_user import AuthzUser
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import (
    FolderCreate,
    FolderRead,
    FolderType,
    FolderUpdate,
    FolderUpdateBulk,
)
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/folder", dependencies=[Depends(get_current_user)], tags=["folder", "mcp"]
)


# --- create operations


@router.put(
    "",
    response_model=FolderRead,
    summary="Creates a new Folder and returns it with the generated ID.",
)
def create_folder(
    *,
    folder: FolderCreate,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> FolderRead:
    authz_user.assert_in_project(folder.project_id)
    db_obj = crud_folder.create(db=db, create_dto=folder)
    result = FolderRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.FOLDER_CREATED, result, project_id=folder.project_id)
    return result


# --- read operations


@router.get(
    "/{folder_id}",
    response_model=FolderRead,
    summary="Returns the Folder with the given ID.",
)
def get_by_id(
    *,
    folder_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> FolderRead:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    folder = crud_folder.read(db=db, id=folder_id)
    return FolderRead.model_validate(folder)


@router.get(
    "/sdocids/{folder_id}",
    response_model=dict[DocType, list[int]],
    summary="Returns lists of source document ids per doctype in the specified sdoc folder",
)
def get_sdoc_ids_in_folder_by_doctype(
    *,
    folder_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> dict[DocType, list[int]]:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    folder = crud_folder.read(db=db, id=folder_id)
    if folder.folder_type != FolderType.SDOC_FOLDER:
        raise ValueError("Folder is not an SDOC folder")
    result: dict[DocType, list[int]] = {dt: [] for dt in DocType}
    for sdoc in folder.source_documents:
        result[DocType(sdoc.doctype)].append(sdoc.id)
    return result


@router.get(
    "/project/{project_id}/folder/{folder_type}",
    response_model=list[FolderRead],
    summary="Returns the folders of the folder_type of the project with the given ID",
)
def get_folders_by_project_and_type(
    *,
    project_id: int,
    folder_type: FolderType,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[FolderRead]:
    authz_user.assert_in_project(project_id)
    folders = crud_folder.read_by_project_and_type(
        db=db, proj_id=project_id, folder_type=folder_type
    )
    return [FolderRead.model_validate(folder) for folder in folders]


# --- update operations


@router.patch(
    "/{folder_id}",
    response_model=FolderRead,
    summary="Updates the Folder with the given ID.",
)
def update_by_id(
    *,
    folder_id: int,
    folder_update: FolderUpdate,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> FolderRead:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    db_obj = crud_folder.update(db=db, id=folder_id, update_dto=folder_update)
    result = FolderRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.FOLDER_UPDATED, result, project_id=db_obj.get_project_id()
    )
    return result


@router.patch(
    "/bulk/update",
    response_model=list[FolderRead],
    summary="Updates the Folders with the given IDs.",
)
def update_folders_bulk(
    *,
    folder_updates: list[FolderUpdateBulk],
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[FolderRead]:
    for folder_update in folder_updates:
        authz_user.assert_in_same_project_as(Crud.FOLDER, folder_update.folder_id)

    db_objs = crud_folder.update_bulk(db=db, update_dtos=folder_updates)
    results = [FolderRead.model_validate(folder) for folder in db_objs]
    if results:
        ws.emit_to_projects_grouped(
            DATSEvent.FOLDER_UPDATED_BATCH,
            db_objs,
            to_dto=FolderRead.model_validate,
        )
    return results


# --- delete operations


@router.delete(
    "/{folder_id}",
    response_model=FolderRead,
    summary="Deletes the Folder with the given ID.",
)
def delete_by_id(
    *,
    folder_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> FolderRead:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    folder = crud_folder.read(db=db, id=folder_id)
    project_id = folder.get_project_id()
    db_obj = crud_folder.delete(db=db, id=folder_id)
    result = FolderRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.FOLDER_DELETED, result, project_id=project_id)
    return result
