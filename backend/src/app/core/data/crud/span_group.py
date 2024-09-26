from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_group import (
    SpanGroupCreate,
    SpanGroupCreateIntern,
    SpanGroupUpdate,
)
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.span_group import SpanGroupORM


class CRUDSpanGroup(CRUDBase[SpanGroupORM, SpanGroupCreateIntern, SpanGroupUpdate]):
    def create(self, db: Session, *, create_dto: SpanGroupCreate) -> SpanGroupORM:
        # get or create the annotation document
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=create_dto.user_id, sdoc_id=create_dto.sdoc_id
        )

        return super().create(
            db,
            create_dto=SpanGroupCreateIntern(
                name=create_dto.name,
                annotation_document_id=adoc.id,
            ),
        )

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
