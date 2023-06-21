from typing import Any, Dict

from sqlalchemy import and_, func

from app.core.data.crud.project import crud_project
from app.core.data.dto.analysis import (
    AnalysisQueryParameters,
    CodeFrequencies,
    CodeOccurrence,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
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

    def analyse_code_frequencies(
        self, query_params: AnalysisQueryParameters
    ) -> Dict[str, Any]:  # todo: should return CodeFrequencies
        with self.sqls.db_session() as db:
            query = (
                db.query(
                    SourceDocumentORM,
                    CodeORM,
                    SpanTextORM.text,
                    func.count().label("count"),
                )
                .join(AnnotationDocumentORM)
                .join(SpanAnnotationORM)
                .join(CurrentCodeORM)
                .join(CodeORM)
                .join(SpanTextORM)
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                and_(
                    SourceDocumentORM.project_id == query_params.proj_id,
                    AnnotationDocumentORM.user_id.in_(query_params.user_ids),
                )
            )
            query = query.group_by(SourceDocumentORM, CodeORM, SpanTextORM.id)
            res = query.all()

            project_codes = [
                CodeRead.from_orm(code)
                for code in crud_project.read(db=db, id=query_params.proj_id).codes
            ]
            code_occurrences = [
                CodeOccurrence(
                    sdoc=SourceDocumentRead.from_orm(x[0]),
                    code=CodeRead.from_orm(x[1]),
                    text=x[2],
                    count=x[3],
                )
                for x in res
            ]

        # init code statistics
        # todo: should be of type CodeFrequencies
        code_statistics = {
            code.id: {
                "code": code,
                "count": 0,
                "aggregated_count": 0,
                "occurrences": [],
                "children": [],
            }
            for code in project_codes
        }
        CodeFrequencies.update_forward_refs()

        # fill occurrences and count
        for occurrence in code_occurrences:
            code_statistics[occurrence.code.id]["occurrences"].append(occurrence)
            code_statistics[occurrence.code.id]["count"] += occurrence.count
            code_statistics[occurrence.code.id]["aggregated_count"] += occurrence.count

        # aggregate the count using the code hierarchy
        # todo: this is not correct! we have to go from the leaves to the root to be correct
        for code in project_codes:
            if code.parent_code_id is not None:
                code_statistics[code.parent_code_id][
                    "aggregated_count"
                ] += code_statistics[code.id]["count"]

        # build the result tree
        # todo: should be of type CodeFrequencies
        root = {
            "code": None,
            "count": 0,
            "aggregated_count": 0,  # todo: this should be the total number of codes in the project
            "occurrences": [],
            "children": [],
        }
        for code in project_codes:
            if code.parent_code_id is None:
                root["children"].append(code_statistics[code.id])
            else:
                code_statistics[code.parent_code_id]["children"].append(
                    code_statistics[code.id]
                )

        return root
