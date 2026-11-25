from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
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
from repos.db.crud_base import BATCH_SIZE
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDSpanGroup(
    ProjectCRUDBase[SpanGroupORM, SpanGroupCreateIntern, SpanGroupUpdate]
):
    ### CREATE OPERATIONS ###
    # Inherited from ProjectCRUDBase

    ### READ OPERATIONS ###

    def read_by_user(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        sdoc_id: int | None = None,
    ) -> list[SpanGroupORM]:
        """
        Read the span groups of a user in the project, optionally only those in a
        document.

        Args:
            project_id: The project of the span groups.
            user_id: The user the span groups belong to.
            sdoc_id: Only the span groups in this document.

        Returns:
            The matching span groups, ordered by id.
        """
        query = (
            db.query(self.model)
            .options(*self._load_options())
            .join(self.model.annotation_document)
            .where(
                self.model.project_id == project_id,
                AnnotationDocumentORM.user_id == user_id,
            )
        )
        if sdoc_id is not None:
            query = query.where(AnnotationDocumentORM.source_document_id == sdoc_id)
        return query.order_by(self.model.id).all()

    def read_by_name(
        self, db: Session, *, project_id: int, name: str
    ) -> SpanGroupORM | None:
        return (
            db.query(self.model)
            .options(*self._load_options())
            .filter(self.model.project_id == project_id, self.model.name == name)
            .first()
        )

    def read_span_annotation_ids(
        self, db: Session, *, project_id: int, ids: list[int]
    ) -> dict[int, list[int]]:
        """
        Read the span annotation ids of span groups.

        Args:
            project_id: The project of the span groups.
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
                .where(
                    SpanAnnotationSpanGroupLinkTable.project_id == project_id,
                    SpanAnnotationSpanGroupLinkTable.span_group_id.in_(batch_ids),
                )
                .order_by(SpanAnnotationSpanGroupLinkTable.span_annotation_id)
            ).all()
            for group_id, span_id in rows:
                results[group_id].append(span_id)
        return results

    ### DELETE OPERATIONS ###

    def delete_by_adoc_and_name(
        self, db: Session, *, project_id: int, annotation_document_id: int, name: str
    ) -> None:
        """
        Delete the span groups of that name in an annotation document. Their links to
        span annotations go with them; the span annotations stay.

        Args:
            project_id: The project of the annotation document.
            annotation_document_id: The annotation document of the span groups.
            name: The name of the span groups.
        """
        db.execute(
            delete(self.model).where(
                self.model.project_id == project_id,
                self.model.annotation_document_id == annotation_document_id,
                self.model.name == name,
            )
        )
        db.flush()

    ### OTHER OPERATIONS ###

    def link_groups_spans_batch(
        self, db: Session, *, project_id: int, links: dict[int, list[int]]
    ) -> int:
        """
        Link span groups to span annotations of the project. The composite foreign
        keys of the links reject a group or span annotation of another project.

        Args:
            project_id: The project of the span groups and span annotations.
            links: The span annotation ids by span group id.

        Returns:
            The number of new links; existing links are skipped.
        """
        insert_values = [
            {
                "project_id": project_id,
                "span_group_id": group_id,
                "span_annotation_id": span_id,
            }
            for group_id, span_ids in links.items()
            for span_id in span_ids
        ]
        if not insert_values:
            return 0

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
