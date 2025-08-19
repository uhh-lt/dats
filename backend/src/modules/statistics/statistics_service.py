from collections import Counter

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_text_orm import SpanTextORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.tag.tag_orm import SourceDocumentTagLinkTable, TagORM
from modules.statistics.statistics_dto import KeywordStat, SpanEntityStat, TagStat


def compute_tag_statistics(
    db: Session, sdoc_ids: set[int], top_k: int = 20
) -> list[TagStat]:
    # tag statistics for the sdoc_ids
    count = func.count().label("count")
    query = (
        db.query(TagORM, count)
        .join(
            SourceDocumentTagLinkTable,
            SourceDocumentTagLinkTable.tag_id == TagORM.id,
        )
        .filter(SourceDocumentTagLinkTable.source_document_id.in_(list(sdoc_ids)))
        .group_by(TagORM.id)
        .order_by(count.desc())
        .limit(top_k)
    )
    filtered_res = query.all()
    tag_ids = [tag.id for tag, _ in filtered_res]

    # global tag statistics
    count = func.count().label("count")
    query = (
        db.query(SourceDocumentTagLinkTable.tag_id, count)
        .filter(SourceDocumentTagLinkTable.tag_id.in_(tag_ids))
        .group_by(SourceDocumentTagLinkTable.tag_id)
        .order_by(func.array_position(tag_ids, SourceDocumentTagLinkTable.tag_id))
    )
    global_res = query.all()

    return [
        TagStat(tag=tag, filtered_count=fcount, global_count=gcount)
        for (tag, fcount), (tid, gcount) in zip(filtered_res, global_res)
    ]


def __count_keywords(
    keyword_metadata: list[SourceDocumentMetadataORM],
    top_k: int | None = None,
) -> dict[str, int]:
    # get keyword lists per sdoc
    keywords_list = [x.list_value for x in keyword_metadata if x.list_value is not None]
    # flatten the list
    keywords = [keyword for keyword_list in keywords_list for keyword in keyword_list]
    # count the keywords
    if top_k is None:
        return dict(Counter(keywords))
    else:
        return dict(Counter(keywords).most_common(top_k))


def compute_keyword_statistics(
    db: Session, proj_id: int, sdoc_ids: set[int], top_k: int = 20
) -> list[KeywordStat]:
    # 1. query keyword project metadadta
    project_metadata = crud_project_meta.read_by_project_and_key(
        db=db, project_id=proj_id, key="keywords"
    )
    project_metadata_ids = [pm.id for pm in project_metadata]
    if len(project_metadata_ids) == 0:
        return []

    # 2. query keyword metadata for the sdoc_ids
    filtered_keywords_metadata = (
        db.query(SourceDocumentMetadataORM)
        .filter(
            SourceDocumentMetadataORM.project_metadata_id.in_(project_metadata_ids),
            SourceDocumentMetadataORM.source_document_id.in_(sdoc_ids),
        )
        .all()
    )
    topk_filtered_keywords = __count_keywords(filtered_keywords_metadata, top_k=top_k)

    # 3. query keyword metadata for all sdocs
    all_keywords_metadata = (
        db.query(SourceDocumentMetadataORM)
        .filter(SourceDocumentMetadataORM.project_metadata_id.in_(project_metadata_ids))
        .all()
    )
    all_keywords = __count_keywords(all_keywords_metadata)

    # 4. construct result
    return [
        KeywordStat(
            keyword=keyword,
            filtered_count=count,
            global_count=all_keywords[keyword],
        )
        for keyword, count in topk_filtered_keywords.items()
    ]


def compute_code_statistics(
    db: Session,
    code_id: int,
    sdoc_ids: set[int],
    top_k: int = 20,
) -> list[SpanEntityStat]:
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
