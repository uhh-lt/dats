from typing import Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate, SourceDocumentMetadataUpdate
from app.core.data.orm.source_document import SourceDocumentMetadataORM


class CRUDSourceDocumentMetadata(CRUDBase[SourceDocumentMetadataORM,
                                          SourceDocumentMetadataCreate,
                                          SourceDocumentMetadataUpdate]):
    def update(self,
               db: Session,
               *,
               metadata_id: int,
               update_dto: SourceDocumentMetadataUpdate) -> Optional[SourceDocumentMetadataORM]:
        db_obj = self.read(db=db, id=metadata_id)
        if db_obj.read_only:
            logger.warning((f"Cannot update read-only SourceDocumentMetadata {db_obj.key} from"
                            f" SourceDocument {db_obj.source_document_id}!"))
            return db_obj
        else:
            return super().update(db, id=metadata_id, update_dto=update_dto)



crud_sdoc_meta = CRUDSourceDocumentMetadata(SourceDocumentMetadataORM)
