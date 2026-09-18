from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import (
    ProjectMetadataCreate,
    ProjectMetadataRead,
    ProjectMetadataUpdate,
)
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/projmeta",
    dependencies=[Depends(get_current_user)],
    tags=["projectMetadata", "mcp"],
)


# --- create operations


@router.put(
    "",
    response_model=ProjectMetadataRead,
    summary="Creates a new Metadata and returns it with the generated ID.",
)
def create_metadata(
    *,
    db: Session = Depends(get_db_session),
    metadata: ProjectMetadataCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ProjectMetadataRead:
    authz_user.assert_in_project(metadata.project_id)

    db_metadata = crud_project_meta.create(db=db, create_dto=metadata)
    result = ProjectMetadataRead.model_validate(db_metadata)
    ws.emit_to_project(
        DATSEvent.PROJECT_METADATA_CREATED,
        result,
        project_id=metadata.project_id,
    )
    return result


# --- read operations


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


# --- update operations


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
    ws: WebsocketEmitter = Depends(),
) -> ProjectMetadataRead:
    authz_user.assert_in_same_project_as(Crud.PROJECT_METADATA, metadata_id)

    db_obj = crud_project_meta.update(
        db=db, metadata_id=metadata_id, update_dto=metadata
    )
    result = ProjectMetadataRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.PROJECT_METADATA_UPDATED,
        result,
        project_id=db_obj.get_project_id(),
    )
    return result


# --- delete operations


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
    ws: WebsocketEmitter = Depends(),
) -> ProjectMetadataRead:
    authz_user.assert_in_same_project_as(Crud.PROJECT_METADATA, metadata_id)

    metadata = crud_project_meta.read(db=db, id=metadata_id)
    project_id = metadata.get_project_id()
    db_obj = crud_project_meta.delete(db=db, id=metadata_id)
    result = ProjectMetadataRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.PROJECT_METADATA_DELETED, result, project_id=project_id
    )
    return result
