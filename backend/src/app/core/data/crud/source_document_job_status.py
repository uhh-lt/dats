from typing import List

from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_, false, or_
from sqlalchemy.orm import Session

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
    def create_multi(
        self, db: Session, *, create_dtos: List[SourceDocumentJobStatusCreate]
    ) -> List[SourceDocumentJobStatusORM]:
        db_objs = [self.model(**jsonable_encoder(x)) for x in create_dtos]
        q = db.query(self.model).where(
            or_(
                false(),
                *[
                    and_(
                        SourceDocumentJobStatusORM.id == x.id,
                        SourceDocumentJobStatusORM.type == x.type,
                    )
                    for x in create_dtos
                ],
            )
        )
        q.delete()
        db.add_all(db_objs)
        db.commit()
        return db_objs


crud_sdoc_job_status = CRUDSourceDocumentJobStatus(SourceDocumentJobStatusORM)
