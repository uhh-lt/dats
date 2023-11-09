from typing import List, Optional

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.project_metadata import (
    ProjectMetadataCreate,
    ProjectMetadataUpdate,
)
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.orm.project_metadata import ProjectMetadataORM
from config import conf
from loguru import logger
from sqlalchemy.orm import Session


class CRUDProjectMetadata(
    CRUDBase[
        ProjectMetadataORM,
        ProjectMetadataCreate,
        ProjectMetadataUpdate,
    ]
):
    def create(
        self, db: Session, *, create_dto: ProjectMetadataCreate
    ) -> ProjectMetadataORM:
        db_obj = super().create(db=db, create_dto=create_dto)

        # we have to create sdoc metadata for all existing sdocs
        metadata_create_dtos = [
            SourceDocumentMetadataCreate.with_metatype(
                source_document_id=sdoc.id,
                project_metadata_id=db_obj.id,
                metatype=create_dto.metatype,
            )
            for sdoc in db_obj.project.source_documents
            if sdoc.doctype == create_dto.doctype
        ]
        crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)

        return db_obj

    def update(
        self, db: Session, *, metadata_id: int, update_dto: ProjectMetadataUpdate
    ) -> Optional[ProjectMetadataORM]:
        db_obj = self.read(db=db, id=metadata_id)
        if db_obj.read_only:
            logger.warning(
                (
                    f"Cannot update read-only ProjectMetadata {db_obj.key} from"
                    f" Project {db_obj.project_id}!"
                )
            )
            return db_obj
        else:
            # update metadata
            metadata_orm = super().update(db, id=metadata_id, update_dto=update_dto)
            return metadata_orm

    def read_by_project_and_key(
        self, db: Session, project_id: int, key: str
    ) -> List[ProjectMetadataORM]:
        db_objs = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.key == key,
            )
            .all()
        )
        return db_objs

    def read_by_project(
        self,
        db: Session,
        *,
        proj_id: int,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[ProjectMetadataORM]:
        query = db.query(self.model).filter(self.model.project_id == proj_id)
        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    def create_project_metadata_for_project(
        self, db: Session, proj_id: int
    ) -> List[ProjectMetadataORM]:
        created: List[ProjectMetadataORM] = []

        for project_metadata in conf.project_metadata.values():
            create_dto = ProjectMetadataCreate(
                project_id=proj_id,
                key=project_metadata["key"],
                metatype=project_metadata["metatype"],
                read_only=project_metadata["read_only"],
                doctype=project_metadata["doctype"],
            )
            db_obj = self.create(db=db, create_dto=create_dto)
            created.append(db_obj)

        return created


crud_project_meta = CRUDProjectMetadata(ProjectMetadataORM)
