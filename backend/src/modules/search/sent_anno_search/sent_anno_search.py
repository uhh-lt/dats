from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_dto import CodeRead
from core.code.code_orm import CodeORM
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from modules.search.search_dto import (
    SentenceAnnotationRow,
    SentenceAnnotationSearchResult,
)
from modules.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.search_builder import SearchBuilder
from systems.search_system.sorting import Sort


def find_sentence_annotations_info(
    db: Session,
    project_id: int,
) -> list[ColumnInfo[SentAnnoColumns]]:
    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project_meta.read_by_project(db=db, proj_id=project_id)
    ]
    metadata_column_info = [
        ColumnInfo.from_project_metadata(pm)
        for pm in project_metadata
        if pm.doctype in [DocType.text]
    ]

    return [
        ColumnInfo[SentAnnoColumns].from_column(column) for column in SentAnnoColumns
    ] + metadata_column_info


def find_sentence_annotations(
    db: Session,
    project_id: int,
    filter: Filter[SentAnnoColumns],
    sorts: list[Sort[SentAnnoColumns]],
    page: int | None = None,
    page_size: int | None = None,
) -> SentenceAnnotationSearchResult:
    builder = SearchBuilder(db, filter, sorts)
    # build the initial subquery that queries all necessary data for the desired output
    subquery = builder.init_subquery(
        db.query(
            SentenceAnnotationORM.id,
        ).group_by(
            SentenceAnnotationORM.id,
        )
    ).build_subquery()
    builder.init_query(
        db.query(
            SentenceAnnotationORM.id,
            SentenceAnnotationORM.sentence_id_start,
            SentenceAnnotationORM.sentence_id_end,
            AnnotationDocumentORM.user_id,
        )
        .add_entity(CodeORM)
        .add_entity(SourceDocumentORM)
        .join(subquery, SentenceAnnotationORM.id == subquery.c.id)
        .filter(SourceDocumentORM.project_id == project_id)
        .filter(CodeORM.enabled == True)  # noqa: E712
    )._join_query(
        AnnotationDocumentORM,
        AnnotationDocumentORM.id == SentenceAnnotationORM.annotation_document_id,
    )._join_query(
        SourceDocumentORM,
        SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
    )._join_query(
        CodeORM,
        CodeORM.id == SentenceAnnotationORM.code_id,
    ).build_query()
    result_rows, total_results = builder.execute_query(
        page_number=page,
        page_size=page_size,
    )

    data = []
    for row in result_rows:
        sent_start = row[1]
        sent_end = row[2]
        sdoc_orm: SourceDocumentORM = row[5]
        data.append(
            SentenceAnnotationRow(
                id=row[0],
                user_id=row[3],
                code=CodeRead.model_validate(row[4]),
                sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                tag_ids=[tag.id for tag in sdoc_orm.tags],
                text=" ".join(sdoc_orm.data.sentences[sent_start : sent_end + 1]),
                memo=None,
            )
        )
    return SentenceAnnotationSearchResult(total_results=total_results, data=data)
