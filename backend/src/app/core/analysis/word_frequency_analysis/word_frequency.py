from typing import List, Optional

from sqlalchemy import distinct, func

from app.core.analysis.word_frequency_analysis.word_frequency_columns import (
    WordFrequencyColumns,
)
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import WordFrequencyResult, WordFrequencyStat
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.export.export_service import ExportService
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.word_frequency import WordFrequencyORM
from app.core.db.sql_service import SQLService
from app.core.search.column_info import (
    ColumnInfo,
)
from app.core.search.filtering import Filter
from app.core.search.search_builder import SearchBuilder
from app.core.search.sorting import Sort


def word_frequency_info(
    project_id: int,
) -> List[ColumnInfo[WordFrequencyColumns]]:
    with SQLService().db_session() as db:
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
        ColumnInfo[WordFrequencyColumns].from_column(column)
        for column in WordFrequencyColumns
    ] + metadata_column_info


def word_frequency(
    project_id: int,
    filter: Filter[WordFrequencyColumns],
    sorts: List[Sort[WordFrequencyColumns]],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> WordFrequencyResult:
    with SQLService().db_session() as db:
        # count all words, all sdocs query (uses filtering)
        builder = SearchBuilder(db=db, filter=filter, sorts=[])
        subquery = builder.build_subquery(
            subquery=(
                db.query(
                    SourceDocumentORM.id.label("id"),
                )
                .filter(
                    SourceDocumentORM.project_id == project_id,
                )
                .group_by(SourceDocumentORM.id)
            )
        )

        global_word_count_agg = func.sum(WordFrequencyORM.count).label(
            "global_word_count"
        )
        global_sdoc_count_agg = func.count(distinct(WordFrequencyORM.sdoc_id)).label(
            "global_sdoc_count"
        )
        builder.build_query(
            query=(
                db.query(global_word_count_agg, global_sdoc_count_agg).join(
                    subquery, WordFrequencyORM.sdoc_id == subquery.c.id
                )
            )
        )
        result_rows, total_results = builder.execute_query(
            page_number=None, page_size=None
        )
        first_result_row = result_rows[0] if len(result_rows) > 0 else None

        # early return if no results
        if (
            first_result_row is None
            or first_result_row[0] is None
            or first_result_row[1] is None
        ):
            return WordFrequencyResult(
                total_results=0,
                sdocs_total=0,
                words_total=0,
                word_frequencies=[],
            )
        global_word_count, global_sdoc_count = first_result_row

        # main query (uses filtering, sorting and pagination)
        builder = SearchBuilder(db=db, filter=filter, sorts=sorts)
        subquery = builder.build_subquery(
            subquery=(
                db.query(
                    SourceDocumentORM.id.label("id"),
                )
                .filter(
                    SourceDocumentORM.project_id == project_id,
                )
                .group_by(SourceDocumentORM.id)
            )
        )
        word_count_acc = func.sum(WordFrequencyORM.count).label(
            WordFrequencyColumns.WORD_FREQUENCY
        )
        sdocs_count_agg = func.count(distinct(WordFrequencyORM.sdoc_id)).label(
            WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY
        )
        builder.build_query(
            query=(
                db.query(
                    word_count_acc,
                    WordFrequencyORM.word,
                    (word_count_acc / global_word_count).label(
                        WordFrequencyColumns.WORD_PERCENT
                    ),
                    sdocs_count_agg,
                    (sdocs_count_agg / global_sdoc_count).label(
                        WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT
                    ),
                )
                .join(subquery, WordFrequencyORM.sdoc_id == subquery.c.id)
                .group_by(WordFrequencyORM.word)
            )
        )
        result_rows, total_results = builder.execute_query(
            page_number=page, page_size=page_size
        )

        word_frequency_stats = [
            WordFrequencyStat(
                count=row[0],
                word=row[1],
                word_percent=row[2],
                sdocs=row[3],
                sdocs_percent=row[4],
            )
            for row in result_rows
        ]

        return WordFrequencyResult(
            total_results=total_results,
            sdocs_total=global_sdoc_count,
            words_total=global_word_count,
            word_frequencies=word_frequency_stats,
        )


def word_frequency_export(
    project_id: int,
    filter: Filter[WordFrequencyColumns],
) -> str:
    export_service = ExportService()

    wf_result = word_frequency(project_id=project_id, filter=filter, sorts=[])
    return export_service.export_word_frequencies(
        project_id=project_id, wf_result=wf_result
    )
