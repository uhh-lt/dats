from typing import List

from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.folder import crud_folder
from app.core.data.dto.folder import (
    FolderCreate,
    FolderRead,
    FolderTreeRead,
    FolderUpdate,
)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session

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


@router.get("/subfolders/{folder_id}", response_model=List[FolderRead])
def get_subfolders(
    folder_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[FolderRead]:
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
    db_obj = crud_folder.remove(db=db, id=folder_id)
    return FolderRead.model_validate(db_obj)
