from datetime import datetime
from typing import List

import pandas as pd
from sqlalchemy import func
from sqlalchemy.orm import aliased

from app.core.analysis.timeline_analysis.timeline_analysis_columns import (
    TimelineAnalysisColumns,
)
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import DateGroupBy, TimelineAnalysisResult
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.db.sql_service import SQLService
from app.core.db.sql_utils import aggregate_ids
from app.core.search.column_info import (
    ColumnInfo,
)
from app.core.search.filtering import Filter
from app.core.search.search_builder import SearchBuilder


def timeline_analysis_info(
    project_id: int,
) -> List[ColumnInfo[TimelineAnalysisColumns]]:
    with SQLService().db_session() as db:
        project_metadata = [
            ProjectMetadataRead.model_validate(pm)
            for pm in crud_project_meta.read_by_project(db=db, proj_id=project_id)
        ]
        metadata_column_info = [
            ColumnInfo.from_project_metadata(pm)
            for pm in project_metadata
            if pm.doctype
            in [
                DocType.text,
            ]
        ]

    return [
        ColumnInfo[TimelineAnalysisColumns].from_column(column)
        for column in TimelineAnalysisColumns
    ] + metadata_column_info


def timeline_analysis(
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter[TimelineAnalysisColumns],
) -> List[TimelineAnalysisResult]:
    # project_metadata_id has to refer to a DATE metadata

    with SQLService().db_session() as db:
        builder = SearchBuilder(db, filter, sorts=[])

        date_metadata = aliased(SourceDocumentMetadataORM)
        subquery = builder.build_subquery(
            subquery=(
                db.query(
                    SourceDocumentORM.id,
                    date_metadata.date_value.label("date"),
                )
                .join(
                    date_metadata,
                    (SourceDocumentORM.id == date_metadata.source_document_id)
                    & (date_metadata.project_metadata_id == project_metadata_id)
                    & (date_metadata.date_value.isnot(None)),
                )
                .group_by(SourceDocumentORM.id, date_metadata.date_value)
                .filter(
                    SourceDocumentORM.project_id == project_id,
                )
            )
        )

        sdoc_ids_agg = aggregate_ids(SourceDocumentORM.id, label="sdoc_ids")
        builder.build_query(
            query=db.query(
                sdoc_ids_agg,
                *group_by.apply(subquery.c["date"]),  # type: ignore
            )
            .join(subquery, SourceDocumentORM.id == subquery.c.id)
            .group_by(*group_by.apply(column=subquery.c["date"]))  # type: ignore
        )

        result_rows, total_results = builder.execute_query(
            page_number=None,
            page_size=None,
        )

        def preprend_zero(x: int):
            return "0" + str(x) if x < 10 else str(x)

        # map from date (YYYY, YYYY-MM, or YYYY-MM-DD) to num sdocs
        result_dict = {
            "-".join(map(lambda x: preprend_zero(x), row[1:])): row[0]
            for row in result_rows
        }

        # find the date range (earliest and latest date)
        date_results = (
            db.query(
                func.min(SourceDocumentMetadataORM.date_value),
                func.max(SourceDocumentMetadataORM.date_value),
            )
            .join(SourceDocumentMetadataORM.source_document)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentMetadataORM.project_metadata_id == project_metadata_id,
                SourceDocumentMetadataORM.date_value.isnot(None),
            )
            .one()
        )
        if len(date_results) == 0:
            return []
        earliest_date, latest_date = date_results

        # create a date range from earliest to latest (used for x-axis)
        parse_str = "%Y"
        freq = "Y"
        if group_by == DateGroupBy.MONTH:
            parse_str = "%Y-%m"
            freq = "M"
        elif group_by == DateGroupBy.DAY:
            parse_str = "%Y-%m-%d"
            freq = "D"
        date_list = (
            pd.date_range(earliest_date, latest_date, freq=freq, inclusive="both")
            .strftime(parse_str)
            .to_list()
        )
        date_list.append(datetime.strftime(date_results[-1], parse_str))
        date_list = sorted(list(set(date_list)))

        # create the result, mapping dates to sdoc counts
        result = [
            TimelineAnalysisResult(
                sdoc_ids=result_dict[date] if date in result_dict else [],
                date=date,
            )
            for date in date_list
        ]
        return result
