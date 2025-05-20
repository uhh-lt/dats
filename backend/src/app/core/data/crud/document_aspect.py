from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.document_aspect import (
    DocumentAspectCreate,
    DocumentAspectUpdate,
)
from app.core.data.orm.document_aspect import DocumentAspectORM


class CRUDDocumentAspect(
    CRUDBase[DocumentAspectORM, DocumentAspectCreate, DocumentAspectUpdate]
):
    pass


crud_document_aspect = CRUDDocumentAspect(DocumentAspectORM)
