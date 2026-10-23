from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.base import ExecutableOption

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_group_dto import (
    SpanGroupCreateIntern,
    SpanGroupUpdate,
)
from core.annotation.span_group_orm import (
    SpanAnnotationSpanGroupLinkTable,
    SpanGroupORM,
)
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


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
            .options(*self._load_options())
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
        return (
            db.query(self.model)
            .options(*self._load_options())
            .filter(self.model.name == name)
            .first()
        )

    def read_span_annotation_ids(
        self, db: Session, *, ids: list[int]
    ) -> dict[int, list[int]]:
        """
        Read the span annotation ids of span groups.

        Args:
            ids: The span groups.

        Returns:
            A mapping of every given span group id to the ids of its span
            annotations, in ascending order.
        """
        results: dict[int, list[int]] = {id: [] for id in ids}
        unique_ids = list(dict.fromkeys(ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            rows = db.execute(
                select(
                    SpanAnnotationSpanGroupLinkTable.span_group_id,
                    SpanAnnotationSpanGroupLinkTable.span_annotation_id,
                )
                .where(SpanAnnotationSpanGroupLinkTable.span_group_id.in_(batch_ids))
                .order_by(SpanAnnotationSpanGroupLinkTable.span_annotation_id)
            ).all()
            for group_id, span_id in rows:
                results[group_id].append(span_id)
        return results

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

    ### LOADING ###

    def _load_options(self) -> list[ExecutableOption]:
        # everything the Read DTO reads through ORM properties
        return [selectinload(self.model.annotation_document)]  # sdoc_id, user_id


crud_span_group = CRUDSpanGroup(SpanGroupORM)
