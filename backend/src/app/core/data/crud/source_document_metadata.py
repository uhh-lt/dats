from typing import Optional, List

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataCreate,
    SourceDocumentMetadataUpdate,
)

from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.source_document import SourceDocumentORM


class CRUDSourceDocumentMetadata(
    CRUDBase[
        SourceDocumentMetadataORM,
        SourceDocumentMetadataCreate,
        SourceDocumentMetadataUpdate,
    ]
):
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
            return super().update(db, id=metadata_id, update_dto=update_dto)

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


crud_sdoc_meta = CRUDSourceDocumentMetadata(SourceDocumentMetadataORM)
