from typing import List, Optional, Tuple, Union

from sqlalchemy.orm import Session

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.search import (
    ElasticSearchDocumentHit,
    PaginatedElasticSearchDocumentHits,
    SimSearchImageHit,
    SimSearchSentenceHit,
)
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.db.sql_service import SQLService
from app.core.filters.column_info import ColumnInfo
from app.core.filters.filtering import (
    Filter,
)
from app.core.filters.sorting import Sort
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.sdoc_search.sdoc_search_builder import SdocSearchBuilder
from app.core.search.sdoc_search.sdoc_search_columns import SearchColumns
from app.core.search.simsearch_service import SimSearchService


def search_info(project_id) -> List[ColumnInfo[SearchColumns]]:
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
                DocType.image,
                DocType.video,
                DocType.audio,
            ]
        ]

    return [
        ColumnInfo[SearchColumns].from_column(column) for column in SearchColumns
    ] + metadata_column_info


def search(
    project_id: int,
    search_query: str,
    expert_mode: bool,
    highlight: bool,
    filter: Filter[SearchColumns],
    sorts: List[Sort[SearchColumns]],
    page_number: Optional[int] = None,
    page_size: Optional[int] = None,
) -> PaginatedElasticSearchDocumentHits:
    if search_query.strip() == "":
        with SQLService().db_session() as db:
            filtered_sdoc_ids, total_results = filter_sdoc_ids(
                db,
                project_id,
                filter,
                sorts,
                page_number=page_number,
                page_size=page_size,
            )
        return PaginatedElasticSearchDocumentHits(
            hits=[
                ElasticSearchDocumentHit(document_id=sdoc_id)
                for sdoc_id in filtered_sdoc_ids
            ],
            total_results=total_results,
        )
    else:
        # special case: no filter, no sorting -> all sdocs are relevant
        if len(filter.items) == 0 and (sorts is None or len(sorts) == 0):
            filtered_sdoc_ids = None
        else:
            with SQLService().db_session() as db:
                filtered_sdoc_ids, _ = filter_sdoc_ids(db, project_id, filter, sorts)
                filtered_sdoc_ids = set(filtered_sdoc_ids)

        # use elasticseach for full text search
        if page_number is not None and page_size is not None:
            skip = page_number * page_size
            limit = page_size
        else:
            skip = None
            limit = None
        return ElasticSearchService().search_sdocs_by_content_query(
            proj_id=project_id,
            query=search_query,
            sdoc_ids=filtered_sdoc_ids,
            use_simple_query=not expert_mode,
            highlight=highlight,
            skip=skip,
            limit=limit,
        )


def filter_sdoc_ids(
    db: Session,
    project_id: int,
    filter: Filter[SearchColumns],
    sorts: List[Sort[SearchColumns]] = [],
    page_number: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Tuple[List[int], int]:
    builder = SdocSearchBuilder(db, project_id, filter, sorts)
    # build the initial subquery that just queries all sdoc_ids of the project
    subquery = builder.build_subquery(
        subquery=(
            db.query(
                SourceDocumentORM.id,
            )
            .group_by(SourceDocumentORM.id)
            .filter(SourceDocumentORM.project_id == project_id)
        )
    )
    # build the query, specifying the result columns and joining the subquery
    result_rows, total_results = builder.execute_query(
        query=db.query(
            SourceDocumentORM.id,
        ).join(subquery, SourceDocumentORM.id == subquery.c.id),
        page_number=page_number,
        page_size=page_size,
    )
    return [row[0] for row in result_rows], total_results


def find_similar_sentences(
    proj_id: int,
    query: Union[str, List[str], int],
    top_k: int,
    threshold: float,
    filter: Filter[SearchColumns],
) -> List[SimSearchSentenceHit]:
    with SQLService().db_session() as db:
        filtered_sdoc_ids, _ = filter_sdoc_ids(db, proj_id, filter)
    return SimSearchService().find_similar_sentences(
        sdoc_ids_to_search=filtered_sdoc_ids,
        proj_id=proj_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
    )


def find_similar_images(
    proj_id: int,
    query: Union[str, List[str], int],
    top_k: int,
    threshold: float,
    filter: Filter[SearchColumns],
) -> List[SimSearchImageHit]:
    with SQLService().db_session() as db:
        filtered_sdoc_ids, _ = filter_sdoc_ids(db, proj_id, filter)
    return SimSearchService().find_similar_images(
        sdoc_ids_to_search=filtered_sdoc_ids,
        proj_id=proj_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
    )
