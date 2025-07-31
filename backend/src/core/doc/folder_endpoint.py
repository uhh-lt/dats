from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import (
    FolderCreate,
    FolderRead,
    FolderTreeRead,
    FolderType,
    FolderUpdate,
)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/folder", dependencies=[Depends(get_current_user)], tags=["folder"]
)


@router.get("/{folder_id}", response_model=FolderRead)
def get_folder_by_id(
    folder_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> FolderRead:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    folder = crud_folder.read(db=db, id=folder_id)
    return FolderRead.model_validate(folder)


@router.get("/tree/{folder_id}", response_model=FolderTreeRead)
def get_tree_by_id(
    folder_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> FolderTreeRead:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    folder = crud_folder.read(db=db, id=folder_id)
    return FolderTreeRead.model_validate(folder)


@router.get(
    "/project/{project_id}/tree",
    response_model=list[FolderTreeRead],
    summary="Returns the folder tree of the project with the given ID",
)
def get_tree_by_project(
    project_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[FolderTreeRead]:
    authz_user.assert_in_project(project_id)

    folders = crud_folder.read_by_project(db=db, proj_id=project_id)

    folder_map = {
        folder.id: FolderTreeRead.model_validate(folder) for folder in folders
    }

    for folder in folders:
        if folder.parent_id is not None:
            parent_tree = folder_map.get(folder.parent_id)
            if parent_tree:
                parent_tree.children.append(folder_map[folder.id])

    return [folder_map[folder.id] for folder in folders if folder.parent_id is None]


@router.get(
    "/project/{project_id}/folder/{folder_type}",
    response_model=list[FolderRead],
    summary="Returns the folders of the folder_type of the project with the given ID",
)
def get_folders_by_project_and_type(
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


@router.post("/", response_model=FolderRead)
def create_folder(
    folder: FolderCreate,
    db: Session = Depends(get_db_session),
) -> FolderRead:
    db_obj = crud_folder.create(db=db, create_dto=folder)
    return FolderRead.model_validate(db_obj)


@router.put("/{folder_id}", response_model=FolderRead)
def update_folder(
    folder_id: int,
    folder_update: FolderUpdate,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> FolderRead:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    db_obj = crud_folder.update(db=db, id=folder_id, update_dto=folder_update)
    return FolderRead.model_validate(db_obj)


@router.get("/subfolders/{folder_id}", response_model=list[FolderRead])
def get_subfolders(
    folder_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[FolderRead]:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    subfolders = crud_folder.read_subfolders(db=db, parent_folder_id=folder_id)
    return [FolderRead.model_validate(folder) for folder in subfolders]


@router.delete("/{folder_id}", response_model=FolderRead)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> FolderRead:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    db_obj = crud_folder.delete(db=db, id=folder_id)
    return FolderRead.model_validate(db_obj)
