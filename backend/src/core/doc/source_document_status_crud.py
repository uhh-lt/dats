from core.doc.source_document_status_dto import (
    SourceDocumentStatusCreate,
    SourceDocumentStatusUpdate,
)
from core.doc.source_document_status_orm import SourceDocumentStatusORM
from repos.db.crud_base import CRUDBase


class CRUDSourceDocumentStatus(
    CRUDBase[
        SourceDocumentStatusORM,
        SourceDocumentStatusCreate,
        SourceDocumentStatusUpdate,
    ]
):
    pass


crud_sdoc_status = CRUDSourceDocumentStatus(SourceDocumentStatusORM)
