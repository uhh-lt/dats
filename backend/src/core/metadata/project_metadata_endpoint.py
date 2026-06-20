from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import (
    ProjectMetadataBulkUpdate,
    ProjectMetadataCreate,
    ProjectMetadataRead,
    ProjectMetadataUpdate,
)
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import MetadataFrequencyRead

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


@router.patch(
    "/bulk/update",
    response_model=list[ProjectMetadataRead],
    summary="Updates multiple project metadata at once.",
)
def update_bulk(
    *,
    db: Session = Depends(get_db_session),
    metadatas: list[ProjectMetadataBulkUpdate],
    authz_user: AuthzUser = Depends(),
) -> list[ProjectMetadataRead]:
    authz_user.assert_in_same_project_as_many(
        Crud.PROJECT_METADATA, [m.id for m in metadatas]
    )
    db_objs = crud_project_meta.update_bulk(db=db, update_dtos=metadatas)
    return [ProjectMetadataRead.model_validate(db_obj) for db_obj in db_objs]


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


@router.delete(
    "/bulk/delete",
    response_model=list[ProjectMetadataRead],
    summary="Deletes all ProjectMetadata with the given IDs.",
)
def delete_bulk_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_ids: list[int],
    authz_user: AuthzUser = Depends(),
) -> list[ProjectMetadataRead]:
    authz_user.assert_in_same_project_as_many(Crud.PROJECT_METADATA, metadata_ids)

    db_objs = crud_project_meta.delete_bulk(db=db, ids=metadata_ids)
    return [ProjectMetadataRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{proj_metadata_id}/frequencies",
    response_model=list[MetadataFrequencyRead],
    summary="Returns a frequency count of all values for a specific ProjectMetadata definition.",
)
def get_metadata_frequencies(
    *,
    db: Session = Depends(get_db_session),
    proj_metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[MetadataFrequencyRead]:
    authz_user.assert_in_same_project_as(Crud.PROJECT_METADATA, proj_metadata_id)

    db_objs = crud_sdoc_meta.read_by_project_metadata(
        db=db, proj_metadata_id=proj_metadata_id
    )

    # extract the non-null value from the database object
    def extract_value(obj):
        if obj.int_value is not None:
            return obj.int_value
        if obj.str_value is not None:
            return obj.str_value
        if obj.boolean_value is not None:
            return obj.boolean_value
        if obj.date_value is not None:
            return obj.date_value.isoformat()
        if obj.list_value is not None:
            return str(
                obj.list_value
            )  # lists must be stringified to be hashable for counting
        return None

    # count frequencies
    value_counts = Counter(extract_value(obj) for obj in db_objs)
    total_count = sum(value_counts.values())

    return [
        MetadataFrequencyRead(
            value=val,
            count=count,
            percentage=round((count / total_count), 2) if total_count > 0 else 0,
        )
        for val, count in value_counts.items()
    ]
