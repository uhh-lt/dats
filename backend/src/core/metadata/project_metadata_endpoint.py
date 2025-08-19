from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import (
    ProjectMetadataCreate,
    ProjectMetadataRead,
    ProjectMetadataUpdate,
)

router = APIRouter(
    prefix="/projmeta",
    dependencies=[Depends(get_current_user)],
    tags=["projectMetadata"],
)


@router.put(
    "",
    response_model=ProjectMetadataRead,
    summary="Creates a new Metadata and returns it with the generated ID.",
)
def create_new_metadata(
    *,
    db: Session = Depends(get_db_session),
    metadata: ProjectMetadataCreate,
    authz_user: AuthzUser = Depends(),
) -> ProjectMetadataRead:
    authz_user.assert_in_project(metadata.project_id)

    db_metadata = crud_project_meta.create(db=db, create_dto=metadata)
    return ProjectMetadataRead.model_validate(db_metadata)


@router.get(
    "/{metadata_id}",
    response_model=ProjectMetadataRead,
    summary="Returns the Metadata with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectMetadataRead:
    authz_user.assert_in_same_project_as(Crud.PROJECT_METADATA, metadata_id)

    db_obj = crud_project_meta.read(db=db, id=metadata_id)
    return ProjectMetadataRead.model_validate(db_obj)


@router.get(
    "/project/{proj_id}",
    response_model=list[ProjectMetadataRead],
    summary="Returns all ProjectMetadata of the Project with the given ID if it exists",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ProjectMetadataRead]:
    authz_user.assert_in_project(proj_id)

    db_objs = crud_project_meta.read_by_project(db=db, proj_id=proj_id)
    metadata = [ProjectMetadataRead.model_validate(meta) for meta in db_objs]
    return metadata


@router.patch(
    "/{metadata_id}",
    response_model=ProjectMetadataRead,
    summary="Updates the Metadata with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    metadata: ProjectMetadataUpdate,
    authz_user: AuthzUser = Depends(),
) -> ProjectMetadataRead:
    authz_user.assert_in_same_project_as(Crud.PROJECT_METADATA, metadata_id)

    db_obj = crud_project_meta.update(
        db=db, metadata_id=metadata_id, update_dto=metadata
    )
    return ProjectMetadataRead.model_validate(db_obj)


@router.delete(
    "/{metadata_id}",
    response_model=ProjectMetadataRead,
    summary="Deletes the Metadata with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectMetadataRead:
    authz_user.assert_in_same_project_as(Crud.PROJECT_METADATA, metadata_id)

    db_obj = crud_project_meta.delete(db=db, id=metadata_id)
    return ProjectMetadataRead.model_validate(db_obj)
