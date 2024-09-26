from typing import List, Tuple

import pandas as pd
from sqlalchemy import Integer, and_, case, func
from sqlalchemy.dialects.postgresql import ARRAY, array_agg
from sqlalchemy.orm import InstrumentedAttribute

from app.core.data.crud.project import crud_project
from app.core.data.dto.analysis import (
    AnnotationOccurrence,
    CodeFrequency,
    CodeOccurrence,
    SampledSdocsResults,
)
from app.core.data.dto.bbox_annotation import BBoxAnnotationRead
from app.core.data.dto.code import CodeRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.span_annotation import SpanAnnotationRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


def aggregate_ids(column: InstrumentedAttribute, label: str):
    return func.array_remove(
        array_agg(func.distinct(column), type_=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


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
                if code.parent_id not in parent_code_id2child_code_ids:
                    parent_code_id2child_code_ids[code.parent_id] = []
                parent_code_id2child_code_ids[code.parent_id].append(code.id)

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
            query = db.query(
                SpanAnnotationORM.code_id,
                SpanAnnotationORM.id,
            ).join(
                AnnotationDocumentORM,
                AnnotationDocumentORM.id == SpanAnnotationORM.annotation_document_id,
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                AnnotationDocumentORM.user_id.in_(user_ids),
                SpanAnnotationORM.code_id.in_(codes_of_interest),
            )
            span_res = query.all()

            # 3. query all bbox annotation occurrences of the codes of interest
            query = db.query(
                BBoxAnnotationORM.code_id,
                BBoxAnnotationORM.id,
            ).join(
                AnnotationDocumentORM,
                AnnotationDocumentORM.id == BBoxAnnotationORM.annotation_document_id,
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                AnnotationDocumentORM.user_id.in_(user_ids),
                BBoxAnnotationORM.code_id.in_(codes_of_interest),
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
                .join(CodeORM, CodeORM.id == SpanAnnotationORM.code_id)
                .join(SpanTextORM, SpanTextORM.id == SpanAnnotationORM.span_text_id)
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                and_(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    CodeORM.id == code_id,
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
                .join(CodeORM, CodeORM.id == BBoxAnnotationORM.code_id)
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                and_(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    CodeORM.id == code_id,
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
                .join(CodeORM, CodeORM.id == SpanAnnotationORM.code_id)
                .join(SpanTextORM, SpanTextORM.id == SpanAnnotationORM.span_text_id)
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                and_(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    CodeORM.id == code_id,
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
                .join(CodeORM, CodeORM.id == BBoxAnnotationORM.code_id)
            )
            # noinspection PyUnresolvedReferences
            query = query.filter(
                and_(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    CodeORM.id == code_id,
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

    def sample_sdocs_by_tags(
        self, project_id: int, tag_ids: List[List[int]], n: int, frac: float
    ) -> List[SampledSdocsResults]:
        all_tag_ids = [tag_id for group in tag_ids for tag_id in group]
        tag2group = {
            tag_id: idx for idx, group in enumerate(tag_ids) for tag_id in group
        }

        with self.sqls.db_session() as db:
            query = (
                db.query(SourceDocumentORM.id, aggregate_ids(DocumentTagORM.id, "tags"))
                .join(SourceDocumentORM.document_tags)
                .where(DocumentTagORM.id.in_(all_tag_ids))
                .group_by(SourceDocumentORM.id)
                # this having clause ensures that the document has one tag from each group
                .having(
                    and_(
                        *[
                            func.sum(
                                case(
                                    (DocumentTagORM.id.in_(group_ids), 1),
                                    else_=0,
                                )
                            )
                            == 1
                            for group_ids in tag_ids
                        ]
                    )
                )
            )
            res = query.all()
            if len(res) == 0:
                return []

            data = []
            groups = set()
            for x in res:
                sdoc = x[0]
                tags = x[1]
                datum = {
                    "sdoc": sdoc,
                }
                for tag_id in tags:
                    group_id = tag2group[tag_id]
                    datum[f"group_{group_id}"] = tag_id
                    groups.add(f"group_{group_id}")
                data.append(datum)

            df = pd.DataFrame(data)
            counts = df.groupby(by=list(groups))["sdoc"].apply(list).to_dict()
            min_count = min([len(x) for x in counts.values()])
            sample_fixed = (
                df.groupby(by=list(groups))
                .sample(n=min(n, min_count))
                .groupby(by=list(groups))["sdoc"]
                .apply(list)
                .to_dict()
            )
            sample_relative = (
                df.groupby(by=list(groups))
                .sample(frac=frac)
                .groupby(by=list(groups))["sdoc"]
                .apply(list)
                .to_dict()
            )

            result: List[SampledSdocsResults] = []
            for group in counts.keys():
                result.append(
                    SampledSdocsResults(
                        tags=[group] if isinstance(group, int) else list(group),
                        sdocs=counts.get(group, []),
                        sample_fixed=sample_fixed.get(group, []),
                        sample_relative=sample_relative.get(group, []),
                    )
                )
            return result

    def count_sdocs_with_date_metadata(
        self, project_id: int, date_metadata_id: int
    ) -> Tuple[int, int]:
        with SQLService().db_session() as db:
            query = (
                db.query(func.count(SourceDocumentORM.id))
                .join(SourceDocumentORM.metadata_)
                .filter(
                    SourceDocumentORM.project_id == project_id,
                    SourceDocumentMetadataORM.project_metadata_id == date_metadata_id,
                    SourceDocumentMetadataORM.date_value.isnot(None),
                )
            )
            sdocs_with_valid_date = query.scalar()

            query = db.query(func.count(SourceDocumentORM.id)).filter(
                SourceDocumentORM.project_id == project_id
            )
            sdocs_total = query.scalar()

        return (sdocs_with_valid_date, sdocs_total)
