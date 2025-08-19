from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import (
    FolderCreate,
    FolderRead,
    FolderType,
    FolderUpdate,
)

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


@router.post("/move_folders", response_model=list[FolderRead])
def move_folders(
    folder_ids: list[int],
    target_folder_id: int,  # -1 means root folder (parent_id is None)
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[FolderRead]:
    for folder_id in folder_ids:
        authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)

    db_obj = crud_folder.move_folders(
        db=db, folder_ids=folder_ids, target_folder_id=target_folder_id
    )
    return [FolderRead.model_validate(folder) for folder in db_obj]


@router.delete("/{folder_id}", response_model=FolderRead)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> FolderRead:
    authz_user.assert_in_same_project_as(Crud.FOLDER, folder_id)
    db_obj = crud_folder.delete(db=db, id=folder_id)
    return FolderRead.model_validate(db_obj)
