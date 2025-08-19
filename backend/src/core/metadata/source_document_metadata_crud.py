from loguru import logger
from sqlalchemy.orm import Session

from common.doc_type import DocType
from common.meta_type import MetaType
from core.metadata.project_metadata_dto import ProjectMetadataRead
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataBaseDTO,
    SourceDocumentMetadataBulkUpdate,
    SourceDocumentMetadataCreate,
    SourceDocumentMetadataUpdate,
)
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from repos.db.crud_base import CRUDBase, NoSuchElementError


# TODO: wohin damit?
def is_correct_type(
    metatye: MetaType, sdoc_metadata: SourceDocumentMetadataBaseDTO
) -> bool:
    match metatye:
        case MetaType.STRING:
            return sdoc_metadata.str_value is not None
        case MetaType.NUMBER:
            return sdoc_metadata.int_value is not None
        case MetaType.DATE:
            return sdoc_metadata.date_value is not None
        case MetaType.BOOLEAN:
            return sdoc_metadata.boolean_value is not None
        case MetaType.LIST:
            return sdoc_metadata.list_value is not None


class CRUDSourceDocumentMetadata(
    CRUDBase[
        SourceDocumentMetadataORM,
        SourceDocumentMetadataCreate,
        SourceDocumentMetadataUpdate,
    ]
):
    ### CREATE OPERATIONS ###

    def create(
        self, db: Session, *, create_dto: SourceDocumentMetadataCreate
    ) -> SourceDocumentMetadataORM:
        from core.metadata.project_metadata_crud import crud_project_meta

        # check if ProjectMetadata exists
        project_metadata = ProjectMetadataRead.model_validate(
            crud_project_meta.read(db, id=create_dto.project_metadata_id)
        )

        # check if value has the correct type
        if not is_correct_type(project_metadata.metatype, create_dto):
            raise ValueError(
                f"provided value has the wrong type (need {project_metadata.metatype})"
            )

        # create metadata
        metadata_orm = super().create(db, create_dto=create_dto)

        return metadata_orm

    def create_multi_with_doctype(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_id: int,
        doctype: DocType,
        keys: list[str],
        values: list,
        manual_commit: bool = False,
    ) -> list[SourceDocumentMetadataORM]:
        from core.metadata.project_metadata_crud import crud_project_meta

        assert len(keys) == len(values), "keys and values must have the same length"

        # read the matching project metadata
        project_metadatas = {
            pm.key: pm
            for pm in crud_project_meta.read_by_project_and_doctype(
                db=db, project_id=project_id, doctype=doctype
            )
        }

        create_dtos: list[SourceDocumentMetadataCreate] = []
        for key, value in zip(keys, values):
            # ensure key exists
            project_metadata = project_metadatas.get(key)
            if project_metadata is None:
                raise ValueError(f"Unknown project metadata key: {key}")

            # ensure value conforms with metatype
            metatype = MetaType(project_metadata.metatype)
            if not metatype.is_value_of_type(value):
                raise ValueError(
                    f"Value for key '{key}' does not conform to metatype {metatype}"
                )

            create_dtos.append(
                SourceDocumentMetadataCreate.with_metatype(
                    metatype=metatype,
                    project_metadata_id=project_metadata.id,
                    value=value,
                    source_document_id=sdoc_id,
                )
            )

        return self.create_multi(
            db=db, create_dtos=create_dtos, manual_commit=manual_commit
        )

    ### READ OPERATIONS ###

    def read_by_project(
        self,
        db: Session,
        *,
        proj_id: int,
        skip: int | None = None,
        limit: int | None = None,
    ) -> list[SourceDocumentMetadataORM]:
        query = (
            db.query(self.model)
            .join(SourceDocumentMetadataORM.project_metadata)
            .filter(ProjectMetadataORM.project_id == proj_id)
        )
        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        db_objs = query.all()
        return db_objs

    def read_by_sdoc_and_key(
        self,
        db: Session,
        *,
        key: str,
        sdoc_id: int,
        skip: int | None = None,
        limit: int | None = None,
    ) -> SourceDocumentMetadataORM:
        query = (
            db.query(self.model)
            .join(SourceDocumentMetadataORM.project_metadata)
            .filter(
                ProjectMetadataORM.key == key,
                SourceDocumentMetadataORM.source_document_id == sdoc_id,
            )
        )
        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        db_obj = query.first()
        if db_obj is None:
            raise NoSuchElementError(self.model, sdoc_id=sdoc_id, key=key)
        return db_obj

    def read_by_sdoc(
        self, db: Session, sdoc_id: int
    ) -> list[SourceDocumentMetadataORM]:
        db_objs = (
            db.query(self.model)
            .filter(SourceDocumentMetadataORM.source_document_id == sdoc_id)
            .all()
        )
        return db_objs

    ### UPDATE OPERATIONS ###

    def update(
        self, db: Session, *, metadata_id: int, update_dto: SourceDocumentMetadataUpdate
    ) -> SourceDocumentMetadataORM:
        db_obj = self.read(db=db, id=metadata_id)
        if db_obj.project_metadata.read_only:
            logger.warning(
                (
                    f"Cannot update read-only SourceDocumentMetadata {db_obj.project_metadata.key} from"
                    f" SourceDocument {db_obj.source_document_id}!"
                )
            )
            return db_obj
        else:
            # check if value has the correct type
            project_metadata = ProjectMetadataRead.model_validate(
                db_obj.project_metadata
            )
            if not is_correct_type(project_metadata.metatype, update_dto):
                raise ValueError(
                    f"provided value has the wrong type (need {project_metadata.metatype})"
                )

            # update metadata
            metadata_orm = super().update(db, id=metadata_id, update_dto=update_dto)

            return metadata_orm

    def update_bulk(
        self, db: Session, *, update_dtos: list[SourceDocumentMetadataBulkUpdate]
    ) -> list[SourceDocumentMetadataORM]:
        db_objs = []
        for update_dto in update_dtos:
            db_obj = self.update(
                db=db,
                metadata_id=update_dto.id,
                update_dto=SourceDocumentMetadataUpdate(
                    **update_dto.model_dump(exclude={"id"})
                ),
            )
            db_objs.append(db_obj)
        return db_objs

    ### DELETE OPERATIONS ###

    def delete_by_project_metadata(self, db: Session, *, project_metadata_id: int):
        db.query(self.model).filter(
            SourceDocumentMetadataORM.project_metadata_id == project_metadata_id
        ).delete()


crud_sdoc_meta = CRUDSourceDocumentMetadata(SourceDocumentMetadataORM)
