from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.dto.project_metadata import (
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
async def create_new_metadata(
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
async def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectMetadataRead:
    authz_user.assert_in_same_project_as(Crud.PROJECT_METADATA, metadata_id)

    db_obj = crud_project_meta.read(db=db, id=metadata_id)
    return ProjectMetadataRead.model_validate(db_obj)


@router.patch(
    "/{metadata_id}",
    response_model=ProjectMetadataRead,
    summary="Updates the Metadata with the given ID.",
)
async def update_by_id(
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
async def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectMetadataRead:
    authz_user.assert_in_same_project_as(Crud.PROJECT_METADATA, metadata_id)

    db_obj = crud_project_meta.remove(db=db, id=metadata_id)
    return ProjectMetadataRead.model_validate(db_obj)
