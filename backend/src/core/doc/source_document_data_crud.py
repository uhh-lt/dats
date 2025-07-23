from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_data_orm import SourceDocumentDataORM
from repos.db.crud_base import CRUDBase, UpdateNotAllowed


class CRUDSourceDocumentData(
    CRUDBase[
        SourceDocumentDataORM,
        SourceDocumentDataCreate,
        UpdateNotAllowed,
    ]
):
    pass


crud_sdoc_data = CRUDSourceDocumentData(SourceDocumentDataORM)
