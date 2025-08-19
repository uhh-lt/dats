import pandas as pd
from sqlalchemy import distinct, func

from common.doc_type import DocType
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from modules.word_frequency.word_frequency_columns import WordFrequencyColumns
from modules.word_frequency.word_frequency_dto import (
    WordFrequencyResult,
    WordFrequencyStat,
)
from modules.word_frequency.word_frequency_orm import WordFrequencyORM
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.search_builder import SearchBuilder
from systems.search_system.sorting import Sort


def word_frequency_info(
    project_id: int,
) -> list[ColumnInfo[WordFrequencyColumns]]:
    with SQLRepo().db_session() as db:
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
    sorts: list[Sort[WordFrequencyColumns]],
    page: int | None = None,
    page_size: int | None = None,
) -> WordFrequencyResult:
    with SQLRepo().db_session() as db:
        # count all words, all sdocs query (uses filtering)
        builder = SearchBuilder(db=db, filter=filter, sorts=[])
        subquery = builder.init_subquery(
            db.query(
                SourceDocumentORM.id.label("id"),
            )
            .filter(
                SourceDocumentORM.project_id == project_id,
            )
            .group_by(SourceDocumentORM.id)
        ).build_subquery()

        global_word_count_agg = func.sum(WordFrequencyORM.count).label(
            "global_word_count"
        )
        global_sdoc_count_agg = func.count(distinct(WordFrequencyORM.sdoc_id)).label(
            "global_sdoc_count"
        )
        builder.init_query(
            db.query(global_word_count_agg, global_sdoc_count_agg).join(
                subquery, WordFrequencyORM.sdoc_id == subquery.c.id
            )
        ).build_query()
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
        subquery = builder.init_subquery(
            db.query(
                SourceDocumentORM.id.label("id"),
            )
            .filter(
                SourceDocumentORM.project_id == project_id,
            )
            .group_by(SourceDocumentORM.id)
        ).build_subquery()
        word_count_acc = func.sum(WordFrequencyORM.count).label(
            WordFrequencyColumns.WORD_FREQUENCY
        )
        sdocs_count_agg = func.count(distinct(WordFrequencyORM.sdoc_id)).label(
            WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY
        )
        builder.init_query(
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
        ).build_query()
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
    fsr = FilesystemRepo()

    wf_result = word_frequency(project_id=project_id, filter=filter, sorts=[])

    data = [
        {
            "word": wf.word,
            "word_percent": wf.word_percent,
            "count": wf.count,
            "sdocs": wf.sdocs,
            "sdocs_percent": wf.sdocs_percent,
        }
        for wf in wf_result.word_frequencies
    ]

    df = pd.DataFrame(data=data)

    # export the data frame
    export_file = fsr.write_df_to_temp_file(
        df=df,
        fn=f"project_{project_id}_word_frequency_export",
    )
    return fsr.get_temp_file_url(export_file.name, relative=True)
