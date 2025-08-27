from datetime import datetime
from typing import Type, TypedDict

import pandas as pd
import srsly
from fastapi.encoders import jsonable_encoder
from loguru import logger
from sqlalchemy import and_, func
from sqlalchemy.orm import Session, aliased

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from modules.analysis.analysis_dto import DateGroupBy
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.timeline_analysis.timeline_analysis_crud import (
    crud_timeline_analysis,
)
from modules.timeline_analysis.timeline_analysis_dto import (
    BBoxAnnoTimelineAnalysisFilter,
    SdocTimelineAnalysisFilter,
    SentAnnoTimelineAnalysisFilter,
    SpanAnnoTimelineAnalysisFilter,
    TAAnnotationAggregationType,
    TimelineAnalysisConcept,
    TimelineAnalysisRead,
    TimelineAnalysisResult,
    TimelineAnalysisType,
    TimelineAnalysisUpdate,
    TimelineAnalysisUpdateIntern,
)
from modules.timeline_analysis.timeline_analysis_orm import TimelineAnalysisORM
from repos.db.sql_utils import aggregate_ids
from systems.search_system.filtering import Filter
from systems.search_system.search_builder import SearchBuilder


class TimelineAnalysisRow(TypedDict):
    data_ids: list[int]
    date: str
    count: int


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
    if update_dto.concepts is None and update_dto.settings is None:
        return db_obj
    elif update_dto.concepts is None:
        update_concepts = ta.concepts
    elif update_dto.settings is None:
        update_concepts = update_dto.concepts
    else:
        update_concepts = update_dto.concepts

    logger.info(f"Updating timeline analysis {id} concepts")

    current_concepts: dict[str, TimelineAnalysisConcept] = {
        concept.id: concept for concept in ta.concepts
    }
    new_concepts: dict[str, TimelineAnalysisConcept] = {
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
                db=db,
                timeline_analysis=ta,
                concept=new_concept,
            )
        else:
            if old_concept.filter_hash != new_concept.filter_hash:
                # the filter has changed, we need to recompute the results
                result = __compute_timeline_analysis(
                    db=db,
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


def recompute_timeline_analysis(db: Session, id: int) -> TimelineAnalysisORM:
    db_obj = crud_timeline_analysis.read(
        db,
        id=id,
    )
    ta = TimelineAnalysisRead.model_validate(db_obj)

    # compute new results
    concepts: dict[str, TimelineAnalysisConcept] = {
        concept.id: concept for concept in ta.concepts
    }
    for concept_id, concept in concepts.items():
        concept.results = __compute_timeline_analysis(
            db=db,
            timeline_analysis=ta,
            concept=concept,
        )

    # update the concepts
    db_obj = crud_timeline_analysis.update(
        db,
        id=id,
        update_dto=TimelineAnalysisUpdateIntern(
            concepts=srsly.json_dumps(jsonable_encoder(list(concepts.values()))),
        ),
    )

    return db_obj


def __compute_timeline_analysis(
    db: Session,
    timeline_analysis: TimelineAnalysisRead,
    concept: TimelineAnalysisConcept,
) -> list[TimelineAnalysisResult]:
    logger.info(f"Computing timeline analysis for concept {concept.id}")

    if timeline_analysis.settings.date_metadata_id is None:
        return []

    match concept.timeline_analysis_type:
        case TimelineAnalysisType.DOCUMENT:
            assert isinstance(concept.ta_specific_filter, SdocTimelineAnalysisFilter), (
                "Invalid filter type, expected SdocTimelineAnalysisFilter"
            )
            result_rows = __sdoc_timeline_analysis(
                db=db,
                project_id=timeline_analysis.project_id,
                group_by=timeline_analysis.settings.group_by,
                project_metadata_id=timeline_analysis.settings.date_metadata_id,
                filter=concept.ta_specific_filter.filter,
            )
        case TimelineAnalysisType.SENT_ANNO:
            assert isinstance(
                concept.ta_specific_filter, SentAnnoTimelineAnalysisFilter
            ), "Invalid filter type, expected SentAnnoTimelineAnalysisFilter"
            assert timeline_analysis.settings.annotation_aggregation_type is not None, (
                "Annotation aggregation type is required for SentAnnoTimelineAnalysis"
                " but not provided in the settings"
            )
            result_rows = __sent_anno_timeline_analysis(
                db=db,
                project_id=timeline_analysis.project_id,
                group_by=timeline_analysis.settings.group_by,
                project_metadata_id=timeline_analysis.settings.date_metadata_id,
                filter=concept.ta_specific_filter.filter,
                annotation_aggregation_type=timeline_analysis.settings.annotation_aggregation_type,
            )
        case TimelineAnalysisType.SPAN_ANNO:
            assert isinstance(
                concept.ta_specific_filter, SpanAnnoTimelineAnalysisFilter
            ), "Invalid filter type, expected SpanAnnoTimelineAnalysisFilter"
            assert timeline_analysis.settings.annotation_aggregation_type is not None, (
                "Annotation aggregation type is required for SpanAnnoTimelineAnalysis"
                " but not provided in the settings"
            )
            result_rows = __span_anno_timeline_analysis(
                db=db,
                project_id=timeline_analysis.project_id,
                group_by=timeline_analysis.settings.group_by,
                project_metadata_id=timeline_analysis.settings.date_metadata_id,
                filter=concept.ta_specific_filter.filter,
                annotation_aggregation_type=timeline_analysis.settings.annotation_aggregation_type,
            )
        case TimelineAnalysisType.BBOX_ANNO:
            assert isinstance(
                concept.ta_specific_filter, BBoxAnnoTimelineAnalysisFilter
            ), "Invalid filter type, expected BBoxAnnoTimelineAnalysisFilter"
            assert timeline_analysis.settings.annotation_aggregation_type is not None, (
                "Annotation aggregation type is required for BBoxAnnoTimelineAnalysis"
                " but not provided in the settings"
            )
            result_rows = __bbox_anno_timeline_analysis(
                db=db,
                project_id=timeline_analysis.project_id,
                group_by=timeline_analysis.settings.group_by,
                project_metadata_id=timeline_analysis.settings.date_metadata_id,
                filter=concept.ta_specific_filter.filter,
                annotation_aggregation_type=timeline_analysis.settings.annotation_aggregation_type,
            )

    # map from date (YYYY, YYYY-MM, or YYYY-MM-DD) to list of rows
    result_dict = {row["date"]: row for row in result_rows}

    # find the date range (earliest and latest date)
    date_results = (
        db.query(
            func.min(SourceDocumentMetadataORM.date_value),
            func.max(SourceDocumentMetadataORM.date_value),
        )
        .filter(
            SourceDocumentMetadataORM.project_metadata_id
            == timeline_analysis.settings.date_metadata_id,
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
    if timeline_analysis.settings.group_by == DateGroupBy.MONTH:
        parse_str = "%Y-%m"
        freq = "M"
    elif timeline_analysis.settings.group_by == DateGroupBy.DAY:
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
            data_ids=result_dict[date]["data_ids"] if date in result_dict else [],
            date=date,
            count=result_dict[date]["count"] if date in result_dict else 0,
        )
        for date in date_list
    ]

    return result


def preprend_zero(x: int):
    return "0" + str(x) if x < 10 else str(x)


def __sdoc_timeline_analysis(
    db: Session,
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter[SdocColumns],
) -> list[TimelineAnalysisRow]:
    builder = SearchBuilder(db, filter, sorts=[])

    date_metadata = aliased(SourceDocumentMetadataORM)
    subquery = (
        builder.init_subquery(
            db.query(
                SourceDocumentORM.id,
                date_metadata.date_value.label("date"),
            )
            .group_by(SourceDocumentORM.id, date_metadata.date_value)
            .filter(
                SourceDocumentORM.project_id == project_id,
            )
        )
        ._join_subquery(
            date_metadata,
            (SourceDocumentORM.id == date_metadata.source_document_id)
            & (date_metadata.project_metadata_id == project_metadata_id)
            & (date_metadata.date_value.isnot(None)),
        )
        .build_subquery()
    )

    sdoc_ids_agg = aggregate_ids(SourceDocumentORM.id, label="sdoc_ids")
    builder.init_query(
        db.query(
            sdoc_ids_agg,
            *group_by.apply(subquery.c["date"]),  # type: ignore
        )
        .join(subquery, SourceDocumentORM.id == subquery.c.id)
        .group_by(*group_by.apply(column=subquery.c["date"]))  # type: ignore
    ).build_query()

    result_rows, _ = builder.execute_query(
        page_number=None,
        page_size=None,
    )

    # convert the result to a list of TimelineAnalysisRow
    return [
        TimelineAnalysisRow(
            data_ids=row[0],
            date="-".join(map(lambda x: preprend_zero(x), row[1:])),
            count=len(row[0]),
        )
        for row in result_rows
    ]


def __sent_anno_timeline_analysis(
    db: Session,
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter,
    annotation_aggregation_type: TAAnnotationAggregationType,
) -> list[TimelineAnalysisRow]:
    # project_metadata_id has to refer to a DATE metadata
    match annotation_aggregation_type:
        case TAAnnotationAggregationType.UNIT:
            # UNIT = Count sentences

            builder = SearchBuilder(db, filter, sorts=[])
            date_metadata = aliased(SourceDocumentMetadataORM)
            subquery = (
                builder.init_subquery(
                    db.query(
                        SentenceAnnotationORM.id,
                        date_metadata.date_value.label("date"),
                    )
                    .group_by(SentenceAnnotationORM.id, date_metadata.date_value)
                    .filter(
                        SourceDocumentORM.project_id == project_id,
                    )
                )
                ._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SentenceAnnotationORM.annotation_document_id,
                )
                ._join_subquery(
                    SourceDocumentORM,
                    SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
                )
                ._join_subquery(
                    date_metadata,
                    (SourceDocumentORM.id == date_metadata.source_document_id)
                    & (date_metadata.project_metadata_id == project_metadata_id)
                    & (date_metadata.date_value.isnot(None)),
                )
                .build_subquery()
            )

            sent_anno_ids = aggregate_ids(
                SentenceAnnotationORM.id, label="sent_anno_ids"
            )
            builder.init_query(
                db.query(
                    sent_anno_ids,
                    *group_by.apply(subquery.c["date"]),  # type: ignore
                )
                .join(subquery, SentenceAnnotationORM.id == subquery.c.id)
                .group_by(*group_by.apply(column=subquery.c["date"]))  # type: ignore
            ).build_query()

            result_rows, _ = builder.execute_query(
                page_number=None,
                page_size=None,
            )
            result = [
                TimelineAnalysisRow(
                    data_ids=row[0],
                    date="-".join(map(lambda x: preprend_zero(x), row[1:])),
                    count=-1,  # we need to update this in the next step
                )
                for row in result_rows
            ]

            # Create a mapping of sent_anno_id to number of sentences
            sent_anno_ids = [data_id for row in result for data_id in row["data_ids"]]
            sent_annos = crud_sentence_anno.read_by_ids(db=db, ids=sent_anno_ids)
            sent_annos2num_sents = {
                sent_anno.id: sent_anno.sentence_id_end
                - sent_anno.sentence_id_start
                + 1
                for sent_anno in sent_annos
            }

            # Update the count of the result
            for res in result:
                res["count"] = sum(
                    sent_annos2num_sents.get(sent_anno_id, 0)
                    for sent_anno_id in res["data_ids"]
                )
            return result

        case TAAnnotationAggregationType.ANNOTATION:
            return __anno_annotation_timeline_analysis(
                db=db,
                project_id=project_id,
                group_by=group_by,
                project_metadata_id=project_metadata_id,
                filter=filter,
                annotation_orm=SentenceAnnotationORM,
            )

        case TAAnnotationAggregationType.DOCUMENT:
            return __anno_document_timeline_analysis(
                db=db,
                project_id=project_id,
                group_by=group_by,
                project_metadata_id=project_metadata_id,
                filter=filter,
                annotation_orm=SentenceAnnotationORM,
            )


def __span_anno_timeline_analysis(
    db: Session,
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter,
    annotation_aggregation_type: TAAnnotationAggregationType,
) -> list[TimelineAnalysisRow]:
    # project_metadata_id has to refer to a DATE metadata
    match annotation_aggregation_type:
        case TAAnnotationAggregationType.UNIT:
            # UNIT = Count sentences

            builder = SearchBuilder(db, filter, sorts=[])
            date_metadata = aliased(SourceDocumentMetadataORM)
            subquery = (
                builder.init_subquery(
                    db.query(
                        SpanAnnotationORM.id,
                        date_metadata.date_value.label("date"),
                    )
                    .group_by(SpanAnnotationORM.id, date_metadata.date_value)
                    .filter(
                        SourceDocumentORM.project_id == project_id,
                    )
                )
                ._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SpanAnnotationORM.annotation_document_id,
                )
                ._join_subquery(
                    SourceDocumentORM,
                    SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
                )
                ._join_subquery(
                    date_metadata,
                    (SourceDocumentORM.id == date_metadata.source_document_id)
                    & (date_metadata.project_metadata_id == project_metadata_id)
                    & (date_metadata.date_value.isnot(None)),
                )
                .build_subquery()
            )

            span_anno_ids = aggregate_ids(SpanAnnotationORM.id, label="span_anno_ids")
            builder.init_query(
                db.query(
                    span_anno_ids,
                    *group_by.apply(subquery.c["date"]),  # type: ignore
                )
                .join(subquery, SpanAnnotationORM.id == subquery.c.id)
                .group_by(*group_by.apply(column=subquery.c["date"]))  # type: ignore
            ).build_query()

            result_rows, _ = builder.execute_query(
                page_number=None,
                page_size=None,
            )
            result = [
                TimelineAnalysisRow(
                    data_ids=row[0],
                    date="-".join(map(lambda x: preprend_zero(x), row[1:])),
                    count=-1,  # we need to update this in the next step
                )
                for row in result_rows
            ]

            # Create a mapping of span_anno_id to number of words
            span_anno_ids = [data_id for row in result for data_id in row["data_ids"]]
            span_annos = crud_span_anno.read_by_ids(db=db, ids=span_anno_ids)
            span_annos2num_sents = {
                span_anno.id: span_anno.end_token - span_anno.begin_token + 1
                for span_anno in span_annos
            }

            # Update the count of the result
            for res in result:
                res["count"] = sum(
                    span_annos2num_sents.get(span_anno_id, 0)
                    for span_anno_id in res["data_ids"]
                )
            return result

        case TAAnnotationAggregationType.ANNOTATION:
            return __anno_annotation_timeline_analysis(
                db=db,
                project_id=project_id,
                group_by=group_by,
                project_metadata_id=project_metadata_id,
                filter=filter,
                annotation_orm=SpanAnnotationORM,
            )

        case TAAnnotationAggregationType.DOCUMENT:
            return __anno_document_timeline_analysis(
                db=db,
                project_id=project_id,
                group_by=group_by,
                project_metadata_id=project_metadata_id,
                filter=filter,
                annotation_orm=SpanAnnotationORM,
            )


def __bbox_anno_timeline_analysis(
    db: Session,
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter,
    annotation_aggregation_type: TAAnnotationAggregationType,
) -> list[TimelineAnalysisRow]:
    # project_metadata_id has to refer to a DATE metadata
    match annotation_aggregation_type:
        case TAAnnotationAggregationType.UNIT:
            # UNIT = ANNO. What is Unit for BBox Annotations?
            return __anno_annotation_timeline_analysis(
                db=db,
                project_id=project_id,
                group_by=group_by,
                project_metadata_id=project_metadata_id,
                filter=filter,
                annotation_orm=BBoxAnnotationORM,
            )

        case TAAnnotationAggregationType.ANNOTATION:
            return __anno_annotation_timeline_analysis(
                db=db,
                project_id=project_id,
                group_by=group_by,
                project_metadata_id=project_metadata_id,
                filter=filter,
                annotation_orm=BBoxAnnotationORM,
            )

        case TAAnnotationAggregationType.DOCUMENT:
            return __anno_document_timeline_analysis(
                db=db,
                project_id=project_id,
                group_by=group_by,
                project_metadata_id=project_metadata_id,
                filter=filter,
                annotation_orm=BBoxAnnotationORM,
            )


def __anno_annotation_timeline_analysis(
    db: Session,
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter,
    annotation_orm: Type[SentenceAnnotationORM]
    | Type[SpanAnnotationORM]
    | Type[BBoxAnnotationORM],
) -> list[TimelineAnalysisRow]:
    # ANNOTATION = Count annotations

    builder = SearchBuilder(db, filter, sorts=[])
    date_metadata = aliased(SourceDocumentMetadataORM)
    subquery = (
        builder.init_subquery(
            db.query(
                annotation_orm.id,
                date_metadata.date_value.label("date"),
            )
            .group_by(annotation_orm.id, date_metadata.date_value)
            .filter(
                SourceDocumentORM.project_id == project_id,
            )
        )
        ._join_subquery(
            AnnotationDocumentORM,
            AnnotationDocumentORM.id == annotation_orm.annotation_document_id,
        )
        ._join_subquery(
            SourceDocumentORM,
            SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
        )
        ._join_subquery(
            date_metadata,
            (SourceDocumentORM.id == date_metadata.source_document_id)
            & (date_metadata.project_metadata_id == project_metadata_id)
            & (date_metadata.date_value.isnot(None)),
        )
        .build_subquery()
    )

    sent_anno_ids = aggregate_ids(annotation_orm.id, label="sent_anno_ids")
    builder.init_query(
        db.query(
            sent_anno_ids,
            *group_by.apply(subquery.c["date"]),  # type: ignore
        )
        .join(subquery, annotation_orm.id == subquery.c.id)
        .group_by(*group_by.apply(column=subquery.c["date"]))  # type: ignore
    ).build_query()

    result_rows, _ = builder.execute_query(
        page_number=None,
        page_size=None,
    )

    return [
        TimelineAnalysisRow(
            data_ids=row[0],
            date="-".join(map(lambda x: preprend_zero(x), row[1:])),
            count=len(row[0]),
        )
        for row in result_rows
    ]


def __anno_document_timeline_analysis(
    db: Session,
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter,
    annotation_orm: Type[SentenceAnnotationORM]
    | Type[SpanAnnotationORM]
    | Type[BBoxAnnotationORM],
) -> list[TimelineAnalysisRow]:
    # DOCUMENT = Count documents

    builder = SearchBuilder(db, filter, sorts=[])
    date_metadata = aliased(SourceDocumentMetadataORM)
    subquery = (
        builder.init_subquery(
            db.query(
                annotation_orm.id.label("anno_id"),
                SourceDocumentORM.id.label("sdoc_id"),
                date_metadata.date_value.label("date"),
            )
            .group_by(
                annotation_orm.id,
                SourceDocumentORM.id,
                date_metadata.date_value,
            )
            .filter(
                SourceDocumentORM.project_id == project_id,
            )
        )
        ._join_subquery(
            AnnotationDocumentORM,
            AnnotationDocumentORM.id == annotation_orm.annotation_document_id,
        )
        ._join_subquery(
            SourceDocumentORM,
            SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
        )
        ._join_subquery(
            date_metadata,
            (SourceDocumentORM.id == date_metadata.source_document_id)
            & (date_metadata.project_metadata_id == project_metadata_id)
            & (date_metadata.date_value.isnot(None)),
        )
        .build_subquery()
    )

    sdoc_ids_agg = aggregate_ids(
        AnnotationDocumentORM.source_document_id, label="sdoc_ids"
    )
    sent_anno_ids = aggregate_ids(annotation_orm.id, label="sent_anno_ids")
    builder.init_query(
        db.query(
            sdoc_ids_agg,
            sent_anno_ids,
            *group_by.apply(subquery.c["date"]),  # type: ignore
        ).group_by(*group_by.apply(column=subquery.c["date"]))  # type: ignore
    )._join_query(
        AnnotationDocumentORM,
        AnnotationDocumentORM.id == annotation_orm.annotation_document_id,
    )._join_query(
        subquery,
        and_(
            annotation_orm.id == subquery.c.anno_id,
            AnnotationDocumentORM.source_document_id == subquery.c.sdoc_id,
        ),
    ).build_query()

    result_rows, _ = builder.execute_query(
        page_number=None,
        page_size=None,
    )

    return [
        TimelineAnalysisRow(
            data_ids=row[1],
            date="-".join(map(lambda x: preprend_zero(x), row[2:])),
            count=len(row[0]),
        )
        for row in result_rows
    ]
