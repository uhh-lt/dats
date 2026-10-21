from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_group_dto import (
    SpanGroupCreateIntern,
    SpanGroupUpdate,
)
from core.annotation.span_group_orm import (
    SpanAnnotationSpanGroupLinkTable,
    SpanGroupORM,
)
from repos.db.crud_base import SQLCRUDBase


class CRUDSpanGroup(SQLCRUDBase[SpanGroupORM, SpanGroupCreateIntern, SpanGroupUpdate]):
    ### CREATE OPERATIONS ###
    # Inherited from SQLCRUDBase

    ### READ OPERATIONS ###

    def read_by_user_and_sdoc(
        self,
        db: Session,
        *,
        user_id: int,
        sdoc_id: int,
        skip: int = 0,
        limit: int = 1000,
    ) -> list[SpanGroupORM]:
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

    def read_by_name(self, db: Session, *, name: str) -> SpanGroupORM | None:
        return db.query(self.model).filter(self.model.name == name).first()

    ### OTHER OPERATIONS ###

    def link_groups_spans_batch(
        self, db: Session, *, links: dict[int, list[int]]
    ) -> int:
        """
        Links the spans to their groups
        """

        # insert links (group <-> span)
        from sqlalchemy.dialects.postgresql import insert

        if len(links) == 0:
            return 0

        insert_values = [
            {"span_group_id": str(group_id), "span_annotation_id": str(span_id)}
            for group_id, span_ids in links.items()
            for span_id in span_ids
        ]

        insert_stmt = (
            insert(SpanAnnotationSpanGroupLinkTable)
            .on_conflict_do_nothing()
            .returning(SpanAnnotationSpanGroupLinkTable.span_group_id)
        )

        new_rows = db.execute(insert_stmt, insert_values).fetchall()
        db.flush()

        return len(new_rows)


crud_span_group = CRUDSpanGroup(SpanGroupORM)
