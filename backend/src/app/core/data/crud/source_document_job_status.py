from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.source_document_job_status import (
    SourceDocumentJobStatusCreate,
    SourceDocumentJobStatusUpdate,
)
from app.core.data.orm.source_document_job_status import SourceDocumentJobStatusORM


class CRUDSourceDocumentJobStatus(
    CRUDBase[
        SourceDocumentJobStatusORM,
        SourceDocumentJobStatusCreate,
        SourceDocumentJobStatusUpdate,
    ]
):
    pass


crud_sdoc_job_status = CRUDSourceDocumentJobStatus(SourceDocumentJobStatusORM)
