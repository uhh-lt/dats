from datetime import datetime
from typing import Dict, List

import pandas as pd
import srsly
from fastapi.encoders import jsonable_encoder
from loguru import logger
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased

from app.core.data.crud.timeline_analysis import crud_timeline_analysis
from app.core.data.dto.analysis import DateGroupBy
from app.core.data.dto.timeline_analysis import (
    SdocTimelineAnalysisFilter,
    SentAnnoTimelineAnalysisFilter,
    TimelineAnalysisConcept,
    TimelineAnalysisRead,
    TimelineAnalysisResult,
    TimelineAnalysisType,
    TimelineAnalysisUpdate,
    TimelineAnalysisUpdateIntern,
)
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.timeline_analysis import TimelineAnalysisORM
from app.core.db.sql_service import SQLService
from app.core.db.sql_utils import aggregate_ids
from app.core.search.filtering import Filter
from app.core.search.sdoc_search.sdoc_search_columns import SdocColumns
from app.core.search.search_builder import SearchBuilder
from app.core.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns


def update_timeline_analysis(
    db: Session, id: int, update_dto: TimelineAnalysisUpdate
) -> TimelineAnalysisORM:
    # update everything except the concepts
    update_data = update_dto.model_dump(
        exclude_unset=True, exclude={"concepts", "settings"}
    )
    if update_dto.settings is not None:
        update_data["settings"] = srsly.json_dumps(
            jsonable_encoder(update_dto.settings)
        )
    db_obj = crud_timeline_analysis.update(
        db,
        id=id,
        update_dto=TimelineAnalysisUpdateIntern(**update_data),
    )
    ta = TimelineAnalysisRead.model_validate(db_obj)

    # check if we even need to update concepts
    if ta.settings.date_metadata_id is None:
        return db_obj

    if update_dto.concepts is None and update_dto.settings is None:
        return db_obj
    elif update_dto.concepts is None:
        update_concepts = ta.concepts
    elif update_dto.settings is None:
        update_concepts = update_dto.concepts
    else:
        update_concepts = update_dto.concepts

    logger.info(f"Updating timeline analysis {id} concepts")

    current_concepts: Dict[str, TimelineAnalysisConcept] = {
        concept.id: concept for concept in ta.concepts
    }
    new_concepts: Dict[str, TimelineAnalysisConcept] = {
        concept.id: TimelineAnalysisConcept(
            id=concept.id,
            name=concept.name,
            description=concept.description,
            timeline_analysis_type=ta.timeline_analysis_type,
            visible=concept.visible,
            ta_specific_filter=concept.ta_specific_filter,
            color=concept.color,
            filter_hash=hash(
                srsly.json_dumps(
                    jsonable_encoder(
                        {
                            "filter": concept.ta_specific_filter.filter,
                            "settings": ta.settings,
                        }
                    )
                )
            ),
            results=[],
        )
        for concept in update_concepts
    }

    # compute new results (if necessary)
    for concept_id, new_concept in new_concepts.items():
        old_concept = current_concepts.get(concept_id)
        if old_concept is None:
            # this is a new concept, we need to compute the results
            result = __compute_timeline_analysis(
                timeline_analysis=ta,
                concept=new_concept,
            )
        else:
            if old_concept.filter_hash != new_concept.filter_hash:
                # the filter has changed, we need to recompute the results
                result = __compute_timeline_analysis(
                    timeline_analysis=ta,
                    concept=new_concept,
                )
            else:
                # the filter has not changed, we can keep the old results
                result = old_concept.results

        new_concept.results = result

    # update the concepts
    db_obj = crud_timeline_analysis.update(
        db,
        id=id,
        update_dto=TimelineAnalysisUpdateIntern(
            concepts=srsly.json_dumps(jsonable_encoder(list(new_concepts.values()))),
        ),
    )

    return db_obj


def __compute_timeline_analysis(
    timeline_analysis: TimelineAnalysisRead,
    concept: TimelineAnalysisConcept,
) -> List[TimelineAnalysisResult]:
    logger.info(f"Computing timeline analysis for concept {concept.id}")

    assert timeline_analysis.settings.date_metadata_id is not None, "No date metadata"

    match concept.timeline_analysis_type:
        case TimelineAnalysisType.DOCUMENT:
            assert isinstance(
                concept.ta_specific_filter, SdocTimelineAnalysisFilter
            ), "Invalid filter type, expected SdocTimelineAnalysisFilter"
            return __sdoc_timeline_analysis(
                project_id=timeline_analysis.project_id,
                group_by=timeline_analysis.settings.group_by,
                project_metadata_id=timeline_analysis.settings.date_metadata_id,
                filter=concept.ta_specific_filter.filter,
            )
        case TimelineAnalysisType.SENT_ANNO:
            assert isinstance(
                concept.ta_specific_filter, SentAnnoTimelineAnalysisFilter
            ), "Invalid filter type, expected SentAnnoTimelineAnalysisFilter"
            return __sent_anno_timeline_analysis(
                project_id=timeline_analysis.project_id,
                group_by=timeline_analysis.settings.group_by,
                project_metadata_id=timeline_analysis.settings.date_metadata_id,
                filter=concept.ta_specific_filter.filter,
            )
        case _:
            raise ValueError("Invalid timeline analysis type")


def __sdoc_timeline_analysis(
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter[SdocColumns],
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
            .filter(
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
                data_ids=result_dict[date] if date in result_dict else [],
                date=date,
            )
            for date in date_list
        ]
        return result


def __sent_anno_timeline_analysis(
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter[SentAnnoColumns],
) -> List[TimelineAnalysisResult]:
    # project_metadata_id has to refer to a DATE metadata

    with SQLService().db_session() as db:
        builder = SearchBuilder(db, filter, sorts=[])

        date_metadata = aliased(SourceDocumentMetadataORM)
        subquery = builder.build_subquery(
            subquery=(
                db.query(
                    SentenceAnnotationORM.id,
                    date_metadata.date_value.label("date"),
                )
                .join(SentenceAnnotationORM.annotation_document)
                .join(AnnotationDocumentORM.source_document)
                .join(
                    date_metadata,
                    (SourceDocumentORM.id == date_metadata.source_document_id)
                    & (date_metadata.project_metadata_id == project_metadata_id)
                    & (date_metadata.date_value.isnot(None)),
                )
                .group_by(SentenceAnnotationORM.id, date_metadata.date_value)
                .filter(
                    SourceDocumentORM.project_id == project_id,
                )
            )
        )

        sent_anno_ids = aggregate_ids(SentenceAnnotationORM.id, label="sent_anno_ids")
        builder.build_query(
            query=db.query(
                sent_anno_ids,
                # Todo: Maybe add more here, same stuffa s in sent_anno_search?
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
            .filter(
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
                data_ids=result_dict[date] if date in result_dict else [],
                date=date,
            )
            for date in date_list
        ]
        return result
