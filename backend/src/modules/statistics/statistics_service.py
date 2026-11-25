from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_text_orm import SpanTextORM
from core.tag.tag_orm import SourceDocumentTagLinkTable, TagORM
from modules.statistics.statistics_dto import SpanEntityStat, TagStat


class StatisticsService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(StatisticsService, cls).__new__(cls)

    def compute_tag_statistics(
        self, *, db: Session, project_id: int, sdoc_ids: set[int], top_k: int = 20
    ) -> list[TagStat]:
        # tag statistics for the sdoc_ids of the project
        count = func.count().label("count")
        query = (
            db.query(TagORM, count)
            .join(
                SourceDocumentTagLinkTable,
                and_(
                    SourceDocumentTagLinkTable.project_id == TagORM.project_id,
                    SourceDocumentTagLinkTable.tag_id == TagORM.id,
                ),
            )
            .filter(
                SourceDocumentTagLinkTable.project_id == project_id,
                SourceDocumentTagLinkTable.source_document_id.in_(list(sdoc_ids)),
            )
            .group_by(TagORM.project_id, TagORM.id)
            .order_by(count.desc())
            .limit(top_k)
        )
        filtered_res = query.all()
        tag_ids = [tag.id for tag, _ in filtered_res]

        # global tag statistics
        count = func.count().label("count")
        query = (
            db.query(SourceDocumentTagLinkTable.tag_id, count)
            .filter(
                SourceDocumentTagLinkTable.project_id == project_id,
                SourceDocumentTagLinkTable.tag_id.in_(tag_ids),
            )
            .group_by(SourceDocumentTagLinkTable.tag_id)
            .order_by(func.array_position(tag_ids, SourceDocumentTagLinkTable.tag_id))
        )
        global_res = query.all()

        return [
            TagStat(tag=tag, filtered_count=fcount, global_count=gcount)
            for (tag, fcount), (tid, gcount) in zip(filtered_res, global_res)
        ]

    def compute_code_statistics(
        self,
        *,
        db: Session,
        project_id: int,
        code_id: int,
        sdoc_ids: set[int],
        top_k: int = 20,
    ) -> list[SpanEntityStat]:
        """
        The most frequent span texts of the code in the documents, with their
        frequency in all documents of the project. A code of another project
        matches nothing.
        """

        # code statistics for the sdoc_ids
        count = func.count(AnnotationDocumentORM.source_document_id.distinct()).label(
            "count"
        )
        query = (
            db.query(
                SpanTextORM.id,
                SpanTextORM.text,
                count,
            )
            .join(SpanTextORM.span_annotations)
            .join(SpanAnnotationORM.annotation_document)
            .group_by(SpanTextORM.id)
            .filter(
                SpanAnnotationORM.project_id == project_id,
                SpanAnnotationORM.code_id == code_id,
                AnnotationDocumentORM.source_document_id.in_(list(sdoc_ids)),
            )
            .order_by(count.desc())
            .limit(top_k)
        )

        filtered_res = query.all()
        span_text_ids = [row[0] for row in filtered_res]

        # global code statistics
        count = func.count(AnnotationDocumentORM.source_document_id.distinct()).label(
            "global_doc_count"
        )
        query = (
            db.query(
                SpanTextORM.id,
                SpanTextORM.text,
                count,
            )
            .join(SpanTextORM.span_annotations)
            .join(SpanAnnotationORM.annotation_document)
            .join(SpanAnnotationORM.code)
            .group_by(SpanTextORM.id)
            .filter(
                SpanAnnotationORM.project_id == project_id,
                SpanAnnotationORM.code_id == code_id,
                SpanTextORM.id.in_(span_text_ids),
            )
            .order_by(func.array_position(span_text_ids, SpanTextORM.id))
        )
        global_res = query.all()

        return [
            SpanEntityStat(
                code_id=code_id,
                span_text=ftext,
                filtered_count=fcount,
                global_count=gcount,
            )
            for (ftextid, ftext, fcount), (gtextid, gtext, gcount) in zip(
                filtered_res, global_res
            )
        ]
