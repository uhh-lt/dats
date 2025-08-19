from sqlalchemy.orm import Session

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_group_dto import (
    SpanGroupCreate,
    SpanGroupCreateIntern,
    SpanGroupUpdate,
)
from core.annotation.span_group_orm import (
    SpanAnnotationSpanGroupLinkTable,
    SpanGroupORM,
)
from repos.db.crud_base import CRUDBase


class CRUDSpanGroup(CRUDBase[SpanGroupORM, SpanGroupCreateIntern, SpanGroupUpdate]):
    def create(
        self, db: Session, *, user_id: int, create_dto: SpanGroupCreate
    ) -> SpanGroupORM:
        # get or create the annotation document
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=user_id, sdoc_id=create_dto.sdoc_id
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
        db.commit()

        return len(new_rows)


crud_span_group = CRUDSpanGroup(SpanGroupORM)
