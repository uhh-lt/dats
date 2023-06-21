from typing import List, Optional

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.action import ActionType
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataCreate,
    SourceDocumentMetadataUpdate,
)
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from loguru import logger
from sqlalchemy.orm import Session


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
        from app.core.data.crud.source_document import crud_sdoc

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
    ) -> Optional[SourceDocumentMetadataORM]:
        db_obj = self.read(db=db, id=metadata_id)
        if db_obj.read_only:
            logger.warning(
                (
                    f"Cannot update read-only SourceDocumentMetadata {db_obj.key} from"
                    f" SourceDocument {db_obj.source_document_id}!"
                )
            )
            return db_obj
        else:
            from app.core.data.crud.source_document import crud_sdoc

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

    def read_by_sdoc_and_key(
        self, db: Session, sdoc_id: int, key: str
    ) -> Optional[SourceDocumentMetadataORM]:
        db_obj = (
            db.query(self.model)
            .filter(self.model.source_document_id == sdoc_id, self.model.key == key)
            .first()
        )
        if not db_obj:
            raise NoSuchElementError(self.model, key=key, source_document_id=sdoc_id)
        return db_obj

    def read_by_project(
        self,
        db: Session,
        *,
        proj_id: int,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[SourceDocumentMetadataORM]:
        query = (
            db.query(self.model, SourceDocumentORM.project_id)
            .join(SourceDocumentORM)
            .filter(SourceDocumentORM.project_id == proj_id)
        )
        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return list(map(lambda t: t[0], query.all()))

    def read_by_sdoc(
        self, db: Session, sdoc_id: int
    ) -> List[SourceDocumentMetadataORM]:
        db_objs = (
            db.query(self.model).filter(self.model.source_document_id == sdoc_id).all()
        )
        return db_objs


crud_sdoc_meta = CRUDSourceDocumentMetadata(SourceDocumentMetadataORM)
