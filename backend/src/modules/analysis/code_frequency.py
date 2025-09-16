from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_text_orm import SpanTextORM
from core.code.code_dto import CodeRead
from core.code.code_orm import CodeORM
from core.doc.source_document_data_dto import SourceDocumentDataRead
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from modules.analysis.analysis_dto import CodeFrequency, CodeOccurrence


def __find_code_children(
    db: Session, project_id: int, code_ids: list[int]
) -> list[list[int]]:
    # 1. find all codes of interest (that is the given code_ids and all their childrens code_ids)
    proj_db_obj = crud_project.read(db=db, id=project_id)
    all_codes = [code for code in proj_db_obj.codes if code.enabled]

    # build a parent_id to child_ids mapping
    parent_code_id2child_code_ids = {}
    for code in all_codes:
        if code.parent_id not in parent_code_id2child_code_ids:
            parent_code_id2child_code_ids[code.parent_id] = []
        parent_code_id2child_code_ids[code.parent_id].append(code.id)

    # bfs to find all children of the given codes
    child_code_id_groups = []
    for code_id in code_ids:
        group = []
        a = [code_id]
        while len(a) > 0:
            b = []
            for code_id in a:
                if code_id in parent_code_id2child_code_ids:
                    b.extend(parent_code_id2child_code_ids[code_id])
            group.extend(b)
            a = b
        child_code_id_groups.append(group)

    return child_code_id_groups


def find_code_frequencies(
    db: Session,
    project_id: int,
    user_ids: list[int],
    code_ids: list[int],
    doctypes: list[DocType],
) -> list[CodeFrequency]:
    # 1. find the children of all codes of interest
    child_code_id_groups = __find_code_children(db, project_id, code_ids)

    # 2. query all span annotation occurrences of the codes of interest
    codes_of_interest = [
        code_id for group in child_code_id_groups for code_id in group
    ] + code_ids
    query = (
        db.query(
            SpanAnnotationORM.code_id,
            func.count(SpanAnnotationORM.id),
        )
        .join(
            AnnotationDocumentORM,
            AnnotationDocumentORM.id == SpanAnnotationORM.annotation_document_id,
        )
        .join(
            SourceDocumentORM,
            SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
        )
        .group_by(SpanAnnotationORM.code_id)
    )
    # noinspection PyUnresolvedReferences
    query = query.filter(
        AnnotationDocumentORM.user_id.in_(user_ids),
        SpanAnnotationORM.code_id.in_(codes_of_interest),
        SourceDocumentORM.doctype.in_(doctypes),
    )
    span_res = query.all()

    # 3. query all sentence annotation occurrences of the codes of interest
    query = (
        db.query(
            SentenceAnnotationORM.code_id,
            func.count(SentenceAnnotationORM.id),
        )
        .join(
            AnnotationDocumentORM,
            AnnotationDocumentORM.id == SentenceAnnotationORM.annotation_document_id,
        )
        .join(
            SourceDocumentORM,
            SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
        )
        .group_by(SentenceAnnotationORM.code_id)
    )
    # noinspection PyUnresolvedReferences
    query = query.filter(
        AnnotationDocumentORM.user_id.in_(user_ids),
        SentenceAnnotationORM.code_id.in_(codes_of_interest),
        SourceDocumentORM.doctype.in_(doctypes),
    )
    sent_res = query.all()

    # 4. query all bbox annotation occurrences of the codes of interest
    query = (
        db.query(
            BBoxAnnotationORM.code_id,
            func.count(BBoxAnnotationORM.id),
        )
        .join(
            AnnotationDocumentORM,
            AnnotationDocumentORM.id == BBoxAnnotationORM.annotation_document_id,
        )
        .join(
            SourceDocumentORM,
            SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
        )
        .group_by(BBoxAnnotationORM.code_id)
    )
    # noinspection PyUnresolvedReferences
    query = query.filter(
        AnnotationDocumentORM.user_id.in_(user_ids),
        BBoxAnnotationORM.code_id.in_(codes_of_interest),
        SourceDocumentORM.doctype.in_(doctypes),
    )
    bbox_res = query.all()

    # 4. count & aggregate the occurrences of each code and their children
    res = span_res + bbox_res + sent_res
    res_dict = {code_id: count for code_id, count in res}

    results: list[CodeFrequency] = []
    for code_id, group in zip(code_ids, child_code_id_groups):
        count = res_dict.get(code_id, 0)
        child_count = sum([res_dict.get(cid, 0) for cid in group])
        results.append(
            CodeFrequency(
                code_id=code_id,
                total_count=count + child_count,
                count=count,
                child_count=child_count,
            )
        )

    return results


def find_code_occurrences(
    db: Session,
    project_id: int,
    user_ids: list[int],
    code_id: int,
    return_children: bool = False,
) -> list[CodeOccurrence]:
    filter_code_ids = [code_id]
    if return_children:
        # 1. find the children of all codes of interest
        child_codes = __find_code_children(db, project_id, [code_id])[0]
        filter_code_ids.extend(child_codes)

    # 2. query all span annotation occurrences of the code
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
            SpanAnnotationORM.annotation_document_id == AnnotationDocumentORM.id,
        )
        .join(CodeORM, CodeORM.id == SpanAnnotationORM.code_id)
        .join(SpanTextORM, SpanTextORM.id == SpanAnnotationORM.span_text_id)
    )
    # noinspection PyUnresolvedReferences
    query = query.filter(
        and_(
            SourceDocumentORM.project_id == project_id,
            AnnotationDocumentORM.user_id.in_(user_ids),
            CodeORM.id.in_(filter_code_ids),
        )
    )
    query = query.group_by(SourceDocumentORM.id, CodeORM.id, SpanTextORM.text)
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

    # 2. query all sentence annotation occurrences of the code
    query = (
        db.query(
            SourceDocumentORM,
            SourceDocumentDataORM,
            SentenceAnnotationORM.sentence_id_start,
            SentenceAnnotationORM.sentence_id_end,
            CodeORM,
            func.count().label("count"),
        )
        .join(
            SourceDocumentDataORM,
            SourceDocumentDataORM.id == SourceDocumentORM.id,
        )
        .join(
            AnnotationDocumentORM,
            AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
        )
        .join(
            SentenceAnnotationORM,
            SentenceAnnotationORM.annotation_document_id == AnnotationDocumentORM.id,
        )
        .join(CodeORM, CodeORM.id == SentenceAnnotationORM.code_id)
    )
    # noinspection PyUnresolvedReferences
    query = query.filter(
        and_(
            SourceDocumentORM.project_id == project_id,
            AnnotationDocumentORM.user_id.in_(user_ids),
            CodeORM.id.in_(filter_code_ids),
        )
    )
    query = query.group_by(
        SourceDocumentORM.id,
        SourceDocumentDataORM.id,
        SentenceAnnotationORM.sentence_id_start,
        SentenceAnnotationORM.sentence_id_end,
        CodeORM.id,
    )
    res = query.all()
    sent_code_occurrences: list[CodeOccurrence] = []
    for x in res:
        sdoc = SourceDocumentRead.model_validate(x[0])
        sdata = SourceDocumentDataRead.model_validate(x[1])
        sent_start = x[2]
        sent_end = x[3]
        code = CodeRead.model_validate(x[4])
        count = x[5]
        text = " ".join(sdata.sentences[sent_start : sent_end + 1])
        sent_code_occurrences.append(
            CodeOccurrence(
                sdoc=sdoc,
                code=code,
                text=text,
                count=count,
            )
        )

    # 3. query all bbox annotation occurrences of the code
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
            BBoxAnnotationORM.annotation_document_id == AnnotationDocumentORM.id,
        )
        .join(CodeORM, CodeORM.id == BBoxAnnotationORM.code_id)
    )
    # noinspection PyUnresolvedReferences
    query = query.filter(
        and_(
            SourceDocumentORM.project_id == project_id,
            AnnotationDocumentORM.user_id.in_(user_ids),
            CodeORM.id.in_(filter_code_ids),
        )
    )
    query = query.group_by(
        SourceDocumentORM.id,
        CodeORM.id,
        BBoxAnnotationORM.annotation_document_id,
    )
    res = query.all()
    bbox_code_occurrences = [
        CodeOccurrence(
            sdoc=SourceDocumentRead.model_validate(x[0]),
            code=CodeRead.model_validate(x[1]),
            text="Image Annotation",
            count=x[3],
        )
        for x in res
    ]

    # 3. return the result
    return span_code_occurrences + bbox_code_occurrences + sent_code_occurrences
