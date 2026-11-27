from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import (
    ProjectMetadataCreate,
    ProjectMetadataRead,
    ProjectMetadataUpdate,
    ProjectMetadataUpdateBulk,
)
from core.metadata.project_metadata_service import ProjectMetadataService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/project-metadata", tags=["projectMetadata", "mcp"])


# --- create operations


@router.put(
    "",
    response_model=ProjectMetadataRead,
    summary="Creates a new Metadata and returns it with the generated ID.",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    metadata: ProjectMetadataCreate,
    ws: WebsocketEmitter = Depends(),
) -> ProjectMetadataRead:
    db_metadata = crud_project_meta.create(
        db=db, project_id=project_id, create_dto=metadata
    )
    result = ProjectMetadataRead.model_validate(db_metadata)
    ws.emit_to_project(
        DATSEvent.PROJECT_METADATA_CREATED, result, project_id=project_id
    )
    return result


# --- read operations


@router.get(
    "",
    response_model=list[ProjectMetadataRead],
    summary="Returns all ProjectMetadata of the Project",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
) -> list[ProjectMetadataRead]:
    db_objs = crud_project_meta.read_by_project(db=db, project_id=project_id)
    return [ProjectMetadataRead.model_validate(meta) for meta in db_objs]


@router.get(
    "/{project_metadata_id}",
    response_model=ProjectMetadataRead,
    summary="Returns the Metadata with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    project_metadata_id: int,
) -> ProjectMetadataRead:
    db_obj = crud_project_meta.read(
        db=db, project_id=project_id, id=project_metadata_id
    )
    return ProjectMetadataRead.model_validate(db_obj)


# --- update operations


@router.patch(
    "/bulk",
    response_model=list[ProjectMetadataRead],
    summary="Updates the Metadata with the given IDs.",
)
def update_bulk(
    *,
    db: DBSession,
    project_id: int,
    metadata: list[ProjectMetadataUpdateBulk],
    ws: WebsocketEmitter = Depends(),
) -> list[ProjectMetadataRead]:
    results = ProjectMetadataService().update_multi(
        db=db, project_id=project_id, update_dtos=metadata
    )
    if results:
        ws.emit_to_project(
            DATSEvent.PROJECT_METADATA_UPDATED_BATCH, results, project_id=project_id
        )
    return results


@router.patch(
    "/{project_metadata_id}",
    response_model=ProjectMetadataRead,
    summary="Updates the Metadata with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    project_metadata_id: int,
    metadata: ProjectMetadataUpdate,
    ws: WebsocketEmitter = Depends(),
) -> ProjectMetadataRead:
    result = ProjectMetadataService().update(
        db=db, project_id=project_id, id=project_metadata_id, update_dto=metadata
    )
    ws.emit_to_project(
        DATSEvent.PROJECT_METADATA_UPDATED, result, project_id=project_id
    )
    return result


# --- delete operations


@router.delete(
    "/{project_metadata_id}",
    response_model=ProjectMetadataRead,
    summary="Deletes the Metadata with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    project_metadata_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ProjectMetadataRead:
    result = ProjectMetadataService().delete(
        db=db, project_id=project_id, id=project_metadata_id
    )
    ws.emit_to_project(
        DATSEvent.PROJECT_METADATA_DELETED, result, project_id=project_id
    )
    return result
