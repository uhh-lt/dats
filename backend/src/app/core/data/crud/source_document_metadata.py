from typing import List, Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.action import ActionType
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataBaseDTO,
    SourceDocumentMetadataCreate,
    SourceDocumentMetadataUpdate,
)
from app.core.data.meta_type import MetaType
from app.core.data.orm.project_metadata import ProjectMetadataORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM


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
    def create(
        self, db: Session, *, create_dto: SourceDocumentMetadataCreate
    ) -> SourceDocumentMetadataORM:
        from app.core.data.crud.project_metadata import crud_project_meta
        from app.core.data.crud.source_document import crud_sdoc

        # check if ProjectMetadata exists
        project_metadata = ProjectMetadataRead.model_validate(
            crud_project_meta.read(db, id=create_dto.project_metadata_id)
        )

        # check if value has the correct type
        if not is_correct_type(project_metadata.metatype, create_dto):
            raise ValueError(
                f"provided value has the wrong type (need {project_metadata.metatype})"
            )

        # create before_state
        sdoc_orm = crud_sdoc.read(db=db, id=create_dto.source_document_id)
        before_state = crud_sdoc._get_action_state_from_orm(db_obj=sdoc_orm)

        # create metadata
        metadata_orm = super().create(db, create_dto=create_dto)

        # create after state
        sdoc_orm = crud_sdoc.read(db=db, id=create_dto.source_document_id)
        after_state = crud_sdoc._get_action_state_from_orm(db_obj=sdoc_orm)

        # create action
        crud_sdoc._create_action(
            db_obj=sdoc_orm,
            action_type=ActionType.UPDATE,
            before_state=before_state,
            after_state=after_state,
        )

        return metadata_orm

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
            from app.core.data.crud.source_document import crud_sdoc

            # check if value has the correct type
            project_metadata = ProjectMetadataRead.model_validate(
                db_obj.project_metadata
            )
            if not is_correct_type(project_metadata.metatype, update_dto):
                raise ValueError(
                    f"provided value has the wrong type (need {project_metadata.metatype})"
                )

            # create before_state
            sdoc_orm = db_obj.source_document
            before_state = crud_sdoc._get_action_state_from_orm(db_obj=sdoc_orm)
            db.expunge(db_obj)

            # update metadata
            metadata_orm = super().update(db, id=metadata_id, update_dto=update_dto)

            # create after state
            sdoc_orm = metadata_orm.source_document
            after_state = crud_sdoc._get_action_state_from_orm(db_obj=sdoc_orm)

            # create action
            crud_sdoc._create_action(
                db_obj=sdoc_orm,
                action_type=ActionType.UPDATE,
                before_state=before_state,
                after_state=after_state,
            )

            return metadata_orm

    def read_by_project(
        self,
        db: Session,
        *,
        proj_id: int,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[SourceDocumentMetadataORM]:
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
        skip: Optional[int] = None,
        limit: Optional[int] = None,
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
    ) -> List[SourceDocumentMetadataORM]:
        db_objs = (
            db.query(self.model)
            .filter(SourceDocumentMetadataORM.source_document_id == sdoc_id)
            .all()
        )
        return db_objs


crud_sdoc_meta = CRUDSourceDocumentMetadata(SourceDocumentMetadataORM)
