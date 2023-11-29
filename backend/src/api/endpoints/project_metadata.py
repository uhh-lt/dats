from typing import Optional

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.dto.project_metadata import (
    ProjectMetadataCreate,
    ProjectMetadataRead,
    ProjectMetadataUpdate,
)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session

router = APIRouter(
    prefix="/projmeta",
    dependencies=[Depends(get_current_user)],
    tags=["projectMetadata"],
)


@router.put(
    "",
    response_model=Optional[ProjectMetadataRead],
    summary="Creates new Metadata",
    description="Creates a new Metadata and returns it with the generated ID.",
)
async def create_new_metadata(
    *, db: Session = Depends(get_db_session), metadata: ProjectMetadataCreate
) -> Optional[ProjectMetadataRead]:
    db_metadata = crud_project_meta.create(db=db, create_dto=metadata)
    return ProjectMetadataRead.from_orm(db_metadata)


@router.get(
    "/{metadata_id}",
    response_model=Optional[ProjectMetadataRead],
    summary="Returns the Metadata",
    description="Returns the Metadata with the given ID.",
)
async def get_by_id(
    *, db: Session = Depends(get_db_session), metadata_id: int
) -> Optional[ProjectMetadataRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_project_meta.read(db=db, id=metadata_id)
    return ProjectMetadataRead.from_orm(db_obj)


@router.patch(
    "/{metadata_id}",
    response_model=ProjectMetadataRead,
    summary="Updates the Metadata",
    description="Updates the Metadata with the given ID.",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    metadata: ProjectMetadataUpdate,
) -> Optional[ProjectMetadataRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_project_meta.update(
        db=db, metadata_id=metadata_id, update_dto=metadata
    )
    return ProjectMetadataRead.from_orm(db_obj)


@router.delete(
    "/{metadata_id}",
    response_model=Optional[ProjectMetadataRead],
    summary="Deletes the Metadata",
    description="Deletes the Metadata with the given ID.",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), metadata_id: int
) -> Optional[ProjectMetadataRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_project_meta.remove(db=db, id=metadata_id)
    return ProjectMetadataRead.from_orm(db_obj)
