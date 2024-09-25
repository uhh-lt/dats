from typing import List

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_group import SpanGroupCreate, SpanGroupUpdate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.span_group import SpanGroupORM
from sqlalchemy.orm import Session


class CRUDSpanGroup(CRUDBase[SpanGroupORM, SpanGroupCreate, SpanGroupUpdate]):
    def read_by_adoc(
        self, db: Session, *, adoc_id: int, skip: int = 0, limit: int = 100
    ) -> List[SpanGroupORM]:
        return (
            db.query(self.model)
            .where(self.model.annotation_document_id == adoc_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def read_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 1000
    ) -> List[SpanGroupORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .where(AnnotationDocumentORM.user_id == user_id)
            .offset(skip)
            .limit(limit)
        )

        return query.all()


crud_span_group = CRUDSpanGroup(SpanGroupORM)
