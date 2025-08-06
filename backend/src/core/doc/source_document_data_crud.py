from core.doc.source_document_data_dto import (
    SourceDocumentDataCreate,
    SourceDocumentDataUpdate,
)
from core.doc.source_document_data_orm import SourceDocumentDataORM
from repos.db.crud_base import CRUDBase


class CRUDSourceDocumentData(
    CRUDBase[
        SourceDocumentDataORM,
        SourceDocumentDataCreate,
        SourceDocumentDataUpdate,
    ]
):
    pass


crud_sdoc_data = CRUDSourceDocumentData(SourceDocumentDataORM)
