from sqlalchemy import func, select, union_all
from sqlalchemy.orm import Session

from core.annotation.annotation_dashboard_dto import RecentAnnotatedDocument
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead


class AnnotationDashboardService:
    def recent_documents(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        limit: int,
    ) -> list[RecentAnnotatedDocument]:
        span_activity = (
            select(
                AnnotationDocumentORM.source_document_id.label("sdoc_id"),
                SpanAnnotationORM.updated.label("annotated_at"),
            )
            .join(
                AnnotationDocumentORM,
                SpanAnnotationORM.annotation_document_id == AnnotationDocumentORM.id,
            )
            .where(
                SpanAnnotationORM.project_id == project_id,
                AnnotationDocumentORM.user_id == user_id,
            )
        )
        sentence_activity = (
            select(
                AnnotationDocumentORM.source_document_id.label("sdoc_id"),
                SentenceAnnotationORM.updated.label("annotated_at"),
            )
            .join(
                AnnotationDocumentORM,
                SentenceAnnotationORM.annotation_document_id
                == AnnotationDocumentORM.id,
            )
            .where(
                SentenceAnnotationORM.project_id == project_id,
                AnnotationDocumentORM.user_id == user_id,
            )
        )
        bbox_activity = (
            select(
                AnnotationDocumentORM.source_document_id.label("sdoc_id"),
                BBoxAnnotationORM.updated.label("annotated_at"),
            )
            .join(
                AnnotationDocumentORM,
                BBoxAnnotationORM.annotation_document_id == AnnotationDocumentORM.id,
            )
            .where(
                BBoxAnnotationORM.project_id == project_id,
                AnnotationDocumentORM.user_id == user_id,
            )
        )
        activity = union_all(span_activity, sentence_activity, bbox_activity).subquery()
        rows = (
            db.query(
                activity.c.sdoc_id,
                func.max(activity.c.annotated_at).label("last_annotated_at"),
                func.count().label("annotation_count"),
            )
            .group_by(activity.c.sdoc_id)
            .order_by(func.max(activity.c.annotated_at).desc())
            .limit(limit)
            .all()
        )
        documents = crud_sdoc.read_by_ids(db, ids=[row.sdoc_id for row in rows])
        return [
            RecentAnnotatedDocument(
                document=SourceDocumentRead.model_validate(document),
                last_annotated_at=row.last_annotated_at,
                annotation_count=row.annotation_count,
            )
            for row, document in zip(rows, documents, strict=True)
        ]


annotation_dashboard_service = AnnotationDashboardService()
