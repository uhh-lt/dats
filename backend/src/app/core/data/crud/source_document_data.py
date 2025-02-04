from app.core.data.crud.crud_base import CRUDBase, UpdateNotAllowed
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.orm.source_document_data import SourceDocumentDataORM


class CRUDSourceDocumentData(
    CRUDBase[
        SourceDocumentDataORM,
        SourceDocumentDataCreate,
        UpdateNotAllowed,
    ]
):
    pass


crud_sdoc_data = CRUDSourceDocumentData(SourceDocumentDataORM)
