from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate, SourceDocumentMetadataUpdate
from app.core.data.orm.source_document import SourceDocumentMetadataORM


class CRUDSourceDocumentMetadata(CRUDBase[SourceDocumentMetadataORM,
                                          SourceDocumentMetadataCreate,
                                          SourceDocumentMetadataUpdate]):
    pass


crud_sdoc_meta = CRUDSourceDocumentMetadata(SourceDocumentMetadataORM)
