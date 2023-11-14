from typing import List

from sqlalchemy import and_, func

from app.core.data.crud.project import crud_project
from app.core.data.dto.analysis import (
    AnnotatedSegmentResult,
    AnnotationOccurrence,
    CodeFrequency,
    CodeOccurrence,
    DateGroupBy,
    TimelineAnalysisResultNew,
)
from app.core.data.dto.bbox_annotation import BBoxAnnotationRead
from app.core.data.dto.code import CodeRead
from app.core.data.dto.filter import AggregatedColumn, Filter
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.span_annotation import SpanAnnotationRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.project_metadata import ProjectMetadataORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService
from app.core.search.search_service import aggregate_ids
from app.util.singleton_meta import SingletonMeta
from sqlalchemy import String, and_, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg


class AnalysisService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls = SQLService()
        return super(AnalysisService, cls).__new__(cls)

    def compute_code_frequency(
        self, project_id: int, user_ids: List[int], code_ids: List[int]
    ) -> List[CodeFrequency]:
        with self.sqls.db_session() as db:
            # 1. find all codes of interest (that is the given code_ids and all their childrens code_ids)
            proj_db_obj = crud_project.read(db=db, id=project_id)
            all_codes = proj_db_obj.codes

            parent_code_id2child_code_ids = {}
            for code in all_codes:
                if code.parent_code_id not in parent_code_id2child_code_ids:
                    parent_code_id2child_code_ids[code.parent_code_id] = []
                parent_code_id2child_code_ids[code.parent_code_id].append(code.id)

            # bfs to find all children of the given codes
            result = []
            for code_id in code_ids:
                group = []
                a = [code_id]
                while len(a) > 0:
                    group.extend(a)
                    b = []
                    for code_id in a:
                        if code_id in parent_code_id2child_code_ids:
                            b.extend(parent_code_id2child_code_ids[code_id])
                    a = b
                result.append(group)

            # 2. query all span annotation occurrences of the codes of interest
            codes_of_interest = [code_id for group in result for code_id in group]
            query = (
                db.query(
                    CurrentCodeORM.code_id,
                    SpanAnnotationORM.id,
                )
                .join(
                    SpanAnnotationORM,
                    SpanAnnotationORM.current_code_id == CurrentCodeORM.id,
                )
                .join(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SpanAnnotationORM.annotation_document_id,
                )
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                AnnotationDocumentORM.user_id.in_(user_ids),
                CurrentCodeORM.code_id.in_(codes_of_interest),
            )
            span_res = query.all()

            # 3. query all bbox annotation occurrences of the codes of interest
            query = (
                db.query(
                    CurrentCodeORM.code_id,
                    BBoxAnnotationORM.id,
                )
                .join(
                    BBoxAnnotationORM,
                    BBoxAnnotationORM.current_code_id == CurrentCodeORM.id,
                )
                .join(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == BBoxAnnotationORM.annotation_document_id,
                )
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                AnnotationDocumentORM.user_id.in_(user_ids),
                CurrentCodeORM.code_id.in_(codes_of_interest),
            )
            bbox_res = query.all()

            # 4. count & aggregate the occurrences of each code and their children
            res = span_res + bbox_res
            return [
                CodeFrequency(
                    code_id=code_id,
                    count=len([x for x in res if x[0] in result[idx]]),
                )
                for idx, code_id in enumerate(code_ids)
            ]

    def find_code_occurrences(
        self, project_id: int, user_ids: List[int], code_id: int
    ) -> List[CodeOccurrence]:
        with self.sqls.db_session() as db:
            # 1. query all span annotation occurrences of the code
            query = (
                db.query(
                    SourceDocumentORM,
                    CodeORM,
                    SpanTextORM.text,
                    func.count().label("count"),
                )
                .join(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                )
                .join(
                    SpanAnnotationORM,
                    SpanAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                )
                .join(
                    CurrentCodeORM,
                    CurrentCodeORM.id == SpanAnnotationORM.current_code_id,
                )
                .join(CodeORM, CodeORM.id == CurrentCodeORM.code_id)
                .join(SpanTextORM, SpanTextORM.id == SpanAnnotationORM.span_text_id)
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                and_(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    CurrentCodeORM.code_id == code_id,
                )
            )
            query = query.group_by(SourceDocumentORM, CodeORM, SpanTextORM.text)
            res = query.all()
            span_code_occurrences = [
                CodeOccurrence(
                    sdoc=SourceDocumentRead.model_validate(x[0]),
                    code=CodeRead.model_validate(x[1]),
                    text=x[2],
                    count=x[3],
                )
                for x in res
            ]

            # 2. query all bbox annotation occurrences of the code
            query = (
                db.query(
                    SourceDocumentORM,
                    CodeORM,
                    BBoxAnnotationORM.annotation_document_id,
                    func.count().label("count"),
                )
                .join(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                )
                .join(
                    BBoxAnnotationORM,
                    BBoxAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                )
                .join(
                    CurrentCodeORM,
                    CurrentCodeORM.id == BBoxAnnotationORM.current_code_id,
                )
                .join(CodeORM, CodeORM.id == CurrentCodeORM.code_id)
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                and_(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    CurrentCodeORM.code_id == code_id,
                )
            )
            query = query.group_by(
                SourceDocumentORM, CodeORM, BBoxAnnotationORM.annotation_document_id
            )
            res = query.all()
            bbox_code_occurrences = [
                CodeOccurrence(
                    sdoc=SourceDocumentRead.model_validate(x[0]),
                    code=CodeRead.model_validate(x[1]),
                    text="Image Annotation",
                    # text=f"Image Annotation ({x[2].x_min}, {x[2].y_min}, {x[2].x_max}, {x[2].y_max})",
                    count=x[3],
                )
                for x in res
            ]

            # 3. return the result
            return span_code_occurrences + bbox_code_occurrences

    def find_annotation_occurrences(
        self, project_id: int, user_ids: List[int], code_id: int
    ) -> List[AnnotationOccurrence]:
        with self.sqls.db_session() as db:
            # 1. query all span annotation occurrences of the code
            query = (
                db.query(
                    SpanAnnotationORM,
                    SourceDocumentORM,
                    CodeORM,
                    SpanTextORM.text,
                )
                .join(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                )
                .join(
                    SpanAnnotationORM,
                    SpanAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                )
                .join(
                    CurrentCodeORM,
                    CurrentCodeORM.id == SpanAnnotationORM.current_code_id,
                )
                .join(CodeORM, CodeORM.id == CurrentCodeORM.code_id)
                .join(SpanTextORM, SpanTextORM.id == SpanAnnotationORM.span_text_id)
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                and_(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    CurrentCodeORM.code_id == code_id,
                )
            )
            res = query.all()
            span_code_occurrences = [
                AnnotationOccurrence(
                    annotation=SpanAnnotationRead.model_validate(x[0]),
                    sdoc=SourceDocumentRead.model_validate(x[1]),
                    code=CodeRead.model_validate(x[2]),
                    text=x[3],
                )
                for x in res
            ]

            # 2. query all bbox annotation occurrences of the code
            query = (
                db.query(
                    BBoxAnnotationORM,
                    SourceDocumentORM,
                    CodeORM,
                )
                .join(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                )
                .join(
                    BBoxAnnotationORM,
                    BBoxAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                )
                .join(
                    CurrentCodeORM,
                    CurrentCodeORM.id == BBoxAnnotationORM.current_code_id,
                )
                .join(CodeORM, CodeORM.id == CurrentCodeORM.code_id)
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                and_(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    CurrentCodeORM.code_id == code_id,
                )
            )
            res = query.all()
            bbox_code_occurrences = [
                AnnotationOccurrence(
                    annotation=BBoxAnnotationRead.model_validate(x[0]),
                    sdoc=SourceDocumentRead.model_validate(x[1]),
                    code=CodeRead.model_validate(x[2]),
                    text="Image Annotation",
                )
                for x in res
            ]

            # 3. return the result
            return span_code_occurrences + bbox_code_occurrences

    def find_annotated_segments(
        self,
        project_id: int,
        user_ids: List[int],
        filter: Filter,
        page: int,
        page_size: int,
    ) -> AnnotatedSegmentResult:
        with self.sqls.db_session() as db:
            tag_ids_agg = aggregate_ids(
                DocumentTagORM.id, label=AggregatedColumn.DOCUMENT_TAG_IDS_LIST
            )

            # a table of all source documents and their tag ids e.g. (1, [1, 5, 7]), (2, [1]), (3, []), ...
            subquery = (
                db.query(
                    SourceDocumentORM.id,
                    tag_ids_agg,
                )
                .join(SourceDocumentORM.document_tags, isouter=True)
                .filter(
                    SourceDocumentORM.project_id == project_id,
                )
                .group_by(SourceDocumentORM.id)
                .subquery()
            )

            query = (
                db.query(
                    func.count().over().label("full_count"),
                    SpanAnnotationORM.id,
                )
                # join Span Annotation with Source Document
                .join(SpanAnnotationORM.annotation_document)
                .join(AnnotationDocumentORM.source_document)
                .join(subquery, SourceDocumentORM.id == subquery.c.id)
                # join Span Annotation with Code
                .join(SpanAnnotationORM.current_code)
                .join(CurrentCodeORM.code)
                # join Span Annotation with Text
                .join(SpanAnnotationORM.span_text)
                # join Span Annotation with Memo
                .join(SpanAnnotationORM.object_handle, isouter=True)
                .join(
                    ObjectHandleORM.memo, isouter=True
                )  # issouter true: return the row, even if no memo exists
                .filter(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    filter.get_sqlalchemy_expression(db=db, subquery_dict=subquery.c),
                )
                .offset(page * page_size)
                .limit(page_size)
            )
            result = query.all()
            total_results = result[0][0] if len(result) > 0 else 0
            return AnnotatedSegmentResult(
                total_results=total_results,
                span_annotation_ids=[row[1] for row in result],
            )

    def timeline_analysis(
        self,
        project_id: int,
        group_by: DateGroupBy,
        project_metadata_id: int,
        filter: Filter,
    ) -> List[TimelineAnalysisResultNew]:
        # project_metadata_id has to refer to a DATE metadata

        with self.sqls.db_session() as db:
            tag_ids_agg = aggregate_ids(
                DocumentTagORM.id, label=AggregatedColumn.DOCUMENT_TAG_IDS_LIST
            )
            code_ids_agg = aggregate_ids(CodeORM.id, AggregatedColumn.CODE_IDS_LIST)
            user_ids_agg = aggregate_ids(UserORM.id, AggregatedColumn.USER_IDS_LIST)
            # span_annotation_ids_agg = aggregate_ids(
            #     SpanAnnotationORM.id, AggregatedColumn.SPAN_ANNOTATION_IDS_LIST
            # )
            span_annotation_tuples_agg = cast(
                array_agg(
                    func.distinct(array([cast(CodeORM.id, String), SpanTextORM.text])),
                ),
                ARRAY(String, dimensions=2),
            ).label(AggregatedColumn.SPAN_ANNOTATIONS)

            subquery = (
                db.query(
                    SourceDocumentORM.id,
                    SourceDocumentMetadataORM.date_value.label("date"),
                    tag_ids_agg,
                    code_ids_agg,
                    user_ids_agg,
                    span_annotation_tuples_agg,
                )
                .join(SourceDocumentORM.document_tags, isouter=True)
                .join(SourceDocumentORM.annotation_documents, isouter=True)
                .join(AnnotationDocumentORM.user)
                .join(AnnotationDocumentORM.span_annotations)
                .join(SpanAnnotationORM.span_text)
                .join(SpanAnnotationORM.current_code)
                .join(CurrentCodeORM.code)
                .join(SourceDocumentORM.metadata_)
                .join(SourceDocumentMetadataORM.project_metadata)
                .filter(
                    SourceDocumentORM.project_id == project_id,
                    ProjectMetadataORM.id == project_metadata_id,
                )
                .group_by(SourceDocumentORM.id, SourceDocumentMetadataORM.date_value)
                .subquery()
            )

            sdoc_ids_agg = aggregate_ids(SourceDocumentORM.id, label="sdoc_ids")

            query = (
                db.query(
                    sdoc_ids_agg,
                    *group_by.apply(
                        subquery.c["date"]
                    ),  # EXTRACT (WEEK FROM TIMESTAMP ...)
                )
                .join(subquery, SourceDocumentORM.id == subquery.c.id)
                .join(
                    SourceDocumentDataORM,
                    SourceDocumentDataORM.id == SourceDocumentORM.id,
                )
                .filter(
                    filter.get_sqlalchemy_expression(db=db, subquery_dict=subquery.c)
                )
                .group_by(*group_by.apply(column=subquery.c["date"]))
            )

            result_rows = query.all()

            def preprend_zero(x: int):
                return "0" + str(x) if x < 10 else str(x)

            result = [
                TimelineAnalysisResultNew(
                    sdoc_ids=row[0],
                    date="-".join(map(lambda x: preprend_zero(x), row[1:])),
                )
                for row in result_rows
            ]
            result.sort(key=lambda x: x.date)
            return result
