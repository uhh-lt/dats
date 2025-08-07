from common.doc_type import DocType
from common.meta_type import MetaType
from config import conf
from core.metadata.project_metadata_dto import (
    ProjectMetadataCreate,
    ProjectMetadataUpdate,
)
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataCreate
from loguru import logger
from repos.db.crud_base import CRUDBase
from sqlalchemy.orm import Session


class CRUDProjectMetadata(
    CRUDBase[
        ProjectMetadataORM,
        ProjectMetadataCreate,
        ProjectMetadataUpdate,
    ]
):
    ### CREATE OPERATIONS ###

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

    def create_project_metadata_for_project(
        self, db: Session, proj_id: int
    ) -> list[ProjectMetadataORM]:
        created: list[ProjectMetadataORM] = []

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

    ### READ OPERATIONS ###

    def read_by_project_and_key(
        self, db: Session, project_id: int, key: str
    ) -> list[ProjectMetadataORM]:
        db_objs = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.key == key,
            )
            .all()
        )
        return db_objs

    def read_by_project_and_doctype(
        self, db: Session, project_id: int, doctype: DocType
    ) -> list[ProjectMetadataORM]:
        db_objs = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.doctype == doctype,
            )
            .all()
        )
        return db_objs

    def read_by_project_and_key_and_metatype_and_doctype(
        self, db: Session, project_id: int, key: str, metatype: str, doctype: str
    ) -> ProjectMetadataORM | None:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.key == key,
                self.model.metatype == metatype,
                self.model.doctype == doctype,
            )
            .first()
        )

    def read_by_project(
        self,
        db: Session,
        *,
        proj_id: int,
        skip: int | None = None,
        limit: int | None = None,
    ) -> list[ProjectMetadataORM]:
        query = db.query(self.model).filter(self.model.project_id == proj_id)
        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    ### UPDATE OPERATIONS ###

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

    ### OTHER OPERATIONS ###

    def exists_by_project_and_key_and_metatype_and_doctype(
        self,
        db: Session,
        project_id: int,
        key: str,
        metatype: MetaType,
        doctype: DocType,
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


crud_project_meta = CRUDProjectMetadata(ProjectMetadataORM)
