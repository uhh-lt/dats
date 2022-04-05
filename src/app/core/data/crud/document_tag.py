from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.document_tag import DocumentTagCreate, DocumentTagUpdate
from app.core.data.orm.document_tag import DocumentTagORM


class CRUDDocumentTag(CRUDBase[DocumentTagORM, DocumentTagCreate, DocumentTagUpdate]):
    pass


crud_document_tag = CRUDDocumentTag(DocumentTagORM)
