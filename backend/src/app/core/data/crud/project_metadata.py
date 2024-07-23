from typing import List, Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.project_metadata import (
    ProjectMetadataCreate,
    ProjectMetadataUpdate,
)
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.meta_type import MetaType
from app.core.data.orm.project_metadata import ProjectMetadataORM
from config import conf


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
        self.__create_all_sdoc_metadata(
            db=db, project_metadata=db_obj, metatype=create_dto.metatype
        )

        return db_obj

    def __create_all_sdoc_metadata(
        self,
        db: Session,
        *,
        project_metadata: ProjectMetadataORM,
        metatype: MetaType | str,
    ):
        metadata_create_dtos = [
            SourceDocumentMetadataCreate.with_metatype(
                source_document_id=sdoc.id,
                project_metadata_id=project_metadata.id,
                metatype=metatype,
            )
            for sdoc in project_metadata.project.source_documents
            if sdoc.doctype == project_metadata.doctype
        ]
        crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)

    def update(
        self, db: Session, *, metadata_id: int, update_dto: ProjectMetadataUpdate
    ) -> ProjectMetadataORM:
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
            # If the user wants to change the type of a metadata,
            # there's no way to reasonably convert the
            # values of existing sdoc metadatas,
            # so we have to remove them.
            # The frontend warns users about this.
            if (
                update_dto.metatype is not None
                and db_obj.metatype != update_dto.metatype
            ):
                crud_sdoc_meta.delete_by_project_metadata(
                    db, project_metadata_id=metadata_id
                )

                # we have to create sdoc metadata for all existing sdocs (as we deleted them before)
                self.__create_all_sdoc_metadata(
                    db=db,
                    project_metadata=db_obj,
                    metatype=update_dto.metatype,
                )

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

    def exists_by_project_and_key_and_metatype_and_doctype(
        self, db: Session, project_id: int, key: str, metatype: str, doctype: str
    ) -> bool:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.key == key,
                self.model.metatype == metatype,
                self.model.doctype == doctype,
            )
            .first()
            is not None
        )

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
                description=project_metadata["description"],
            )
            db_obj = self.create(db=db, create_dto=create_dto)
            created.append(db_obj)

        return created


crud_project_meta = CRUDProjectMetadata(ProjectMetadataORM)
