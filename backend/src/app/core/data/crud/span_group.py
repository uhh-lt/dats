from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_group import SpanGroupCreate, SpanGroupUpdate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.span_group import SpanGroupORM


class CRUDSpanGroup(CRUDBase[SpanGroupORM, SpanGroupCreate, SpanGroupUpdate]):
    def read_by_user_and_sdoc(
        self,
        db: Session,
        *,
        user_id: int,
        sdoc_id: int,
        skip: int = 0,
        limit: int = 1000,
    ) -> List[SpanGroupORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .where(
                AnnotationDocumentORM.user_id == user_id,
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
            .offset(skip)
            .limit(limit)
        )

        return query.all()


crud_span_group = CRUDSpanGroup(SpanGroupORM)
