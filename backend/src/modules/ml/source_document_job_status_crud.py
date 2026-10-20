from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_, false, or_
from sqlalchemy.orm import Session

from modules.ml.source_document_job_status_dto import (
    SourceDocumentJobStatusCreate,
    SourceDocumentJobStatusUpdate,
)
from modules.ml.source_document_job_status_orm import SourceDocumentJobStatusORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDSourceDocumentJobStatus(
    SQLCRUDBase[
        SourceDocumentJobStatusORM,
        SourceDocumentJobStatusCreate,
        SourceDocumentJobStatusUpdate,
    ]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, create_dtos: list[SourceDocumentJobStatusCreate]
    ) -> list[SourceDocumentJobStatusORM]:
        if not create_dtos:
            return []

        # replace existing status rows of the same (id, type)
        for i in range(0, len(create_dtos), BATCH_SIZE):
            batch_dtos = create_dtos[i : i + BATCH_SIZE]
            db.query(self.model).where(
                or_(
                    false(),
                    *[
                        and_(
                            SourceDocumentJobStatusORM.id == x.id,
                            SourceDocumentJobStatusORM.type == x.type,
                        )
                        for x in batch_dtos
                    ],
                )
            ).delete()
        db_objs = [self.model(**jsonable_encoder(x)) for x in create_dtos]
        db.add_all(db_objs)
        db.flush()
        return db_objs


crud_sdoc_job_status = CRUDSourceDocumentJobStatus(SourceDocumentJobStatusORM)
