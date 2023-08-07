from typing import List

from sqlalchemy import and_, func

from app.core.data.crud.project import crud_project
from app.core.data.dto.analysis import CodeFrequency, CodeOccurrence
from app.core.data.dto.code import CodeRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


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
                    sdoc=SourceDocumentRead.from_orm(x[0]),
                    code=CodeRead.from_orm(x[1]),
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
                    sdoc=SourceDocumentRead.from_orm(x[0]),
                    code=CodeRead.from_orm(x[1]),
                    text="Image Annotation",
                    # text=f"Image Annotation ({x[2].x_min}, {x[2].y_min}, {x[2].x_max}, {x[2].y_max})",
                    count=x[3],
                )
                for x in res
            ]

            # 3. return the result
            return span_code_occurrences + bbox_code_occurrences
