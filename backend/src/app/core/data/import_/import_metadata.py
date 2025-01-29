from loguru import logger
from pandas import Series
from sqlalchemy.orm import Session

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.dto.project_metadata import (
    ProjectMetadataCreate,
    ProjectMetadataRead,
)


def create_project_metadata_if_not_exists(
    db: Session,
    create_dto: ProjectMetadataCreate,
):
    exists: bool = crud_project_meta.exists_by_project_and_key_and_metatype_and_doctype(
        db=db,
        project_id=create_dto.project_id,
        key=create_dto.key,
        metatype=create_dto.metatype,
        doctype=create_dto.doctype,
    )
    if not exists:
        crud_create = crud_project_meta.create(
            db=db,
            create_dto=create_dto,
        )
        metadata_read = ProjectMetadataRead.model_validate(crud_create)

        logger.info(f"imported project metadata {metadata_read}")


def import_project_metadata(row: Series, db: Session, proj_id: int) -> None:
    create_dto = ProjectMetadataCreate.model_validate(
        {
            "project_id": proj_id,
            "key": row["key"],
            "metatype": row["metatype"],
            "doctype": row["doctype"],
            "description": row["description"],
        }
    )
    create_project_metadata_if_not_exists(db=db, create_dto=create_dto)
