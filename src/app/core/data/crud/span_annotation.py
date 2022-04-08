from typing import List

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_annotation import SpanAnnotationCreate, SpanAnnotationUpdate
from app.core.data.orm.span_annotation import SpanAnnotationORM


class CRUDSpanAnnotation(CRUDBase[SpanAnnotationORM, SpanAnnotationCreate, SpanAnnotationUpdate]):

    def read_by_adoc(self, db: Session, *, adoc_id: int, skip: int = 0, limit: int = 100) -> List[SpanAnnotationORM]:
        return db.query(self.model).where(self.model.annotation_document_id == adoc_id).offset(skip).limit(limit).all()

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.annotation_document_id == adoc_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))


crud_span_anno = CRUDSpanAnnotation(SpanAnnotationORM)
