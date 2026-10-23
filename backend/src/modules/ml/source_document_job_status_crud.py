from sqlalchemy.orm import Session

from modules.ml.ml_enum import MLJobTypeID
from modules.ml.source_document_job_status_dto import (
    SourceDocumentJobStatusCreate,
    SourceDocumentJobStatusUpdate,
)
from modules.ml.source_document_job_status_orm import SourceDocumentJobStatusORM
from repos.db.crud_base import SQLCRUDBase


class CRUDSourceDocumentJobStatus(
    SQLCRUDBase[
        SourceDocumentJobStatusORM,
        SourceDocumentJobStatusCreate,
        SourceDocumentJobStatusUpdate,
        tuple[int, MLJobTypeID],  # (sdoc id, job type)
    ]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, create_dtos: list[SourceDocumentJobStatusCreate]
    ) -> list[SourceDocumentJobStatusORM]:
        # replace existing status rows of the same (id, type)
        self.delete_multi(db=db, ids=[(x.id, x.type) for x in create_dtos])
        return super().create_multi(db=db, create_dtos=create_dtos)


crud_sdoc_job_status = CRUDSourceDocumentJobStatus(SourceDocumentJobStatusORM)
