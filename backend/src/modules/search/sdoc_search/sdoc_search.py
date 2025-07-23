from typing import List, Optional, Tuple, Union

from common.doc_type import DocType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from modules.search.column_info import ColumnInfo
from modules.search.filtering import Filter
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.search.search_builder import SearchBuilder
from modules.search.search_dto import (
    ElasticSearchDocumentHit,
    PaginatedElasticSearchDocumentHits,
    PaginatedSDocHits,
    SimSearchImageHit,
    SimSearchSentenceHit,
)
from modules.search.sorting import Sort
from modules.simsearch.simsearch_service import SimSearchService
from repos.db.sql_repo import SQLService
from repos.elasticsearch_repo import ElasticSearchService
from sqlalchemy.orm import Session


def search_info(project_id) -> List[ColumnInfo[SdocColumns]]:
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
        ColumnInfo[SdocColumns].from_column(column) for column in SdocColumns
    ] + metadata_column_info


def search(
    project_id: int,
    search_query: str,
    expert_mode: bool,
    highlight: bool,
    filter: Filter[SdocColumns],
    sorts: List[Sort[SdocColumns]],
    page_number: Optional[int] = None,
    page_size: Optional[int] = None,
) -> PaginatedSDocHits:
    data = search_ids(
        project_id,
        search_query,
        expert_mode,
        highlight,
        filter,
        sorts,
        page_number=page_number,
        page_size=page_size,
    )

    # get the additional information about the documents
    with SQLService().db_session() as db:
        sdoc_ids = [hit.id for hit in data.hits]

        # 1. the sdoc itself
        sdoc_db_objs = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
        sdocs = {
            sdoc.id: SourceDocumentRead.model_validate(sdoc) for sdoc in sdoc_db_objs
        }

        # 2. the annotators
        annotators = crud_sdoc.get_annotators(db=db, sdoc_ids=sdoc_ids)  #

        # 3. the tags
        tags = crud_sdoc.get_tags(db=db, sdoc_ids=sdoc_ids)

    return PaginatedSDocHits(
        hits=data.hits,
        sdocs=sdocs,
        annotators=annotators,
        tags=tags,
        total_results=data.total_results,
    )


def search_ids(
    project_id: int,
    search_query: str,
    expert_mode: bool,
    highlight: bool,
    filter: Filter[SdocColumns],
    sorts: List[Sort[SdocColumns]],
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
                ElasticSearchDocumentHit(id=sdoc_id) for sdoc_id in filtered_sdoc_ids
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
    filter: Filter[SdocColumns],
    sorts: List[Sort[SdocColumns]] = [],
    page_number: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Tuple[List[int], int]:
    builder = SearchBuilder(db, filter, sorts)
    # build the initial subquery that just queries all sdoc_ids of the project
    subquery = builder.init_subquery(
        db.query(
            SourceDocumentORM.id,
        )
        .group_by(SourceDocumentORM.id)
        .filter(SourceDocumentORM.project_id == project_id)
    ).build_subquery()
    # build the query, specifying the result columns and joining the subquery
    builder.init_query(
        db.query(
            SourceDocumentORM.id,
        ).join(subquery, SourceDocumentORM.id == subquery.c.id)
    ).build_query()
    result_rows, total_results = builder.execute_query(
        page_number=page_number,
        page_size=page_size,
    )
    return [row[0] for row in result_rows], total_results


def find_similar_sentences(
    proj_id: int,
    query: Union[str, List[str], int],
    top_k: int,
    threshold: float,
    filter: Filter[SdocColumns],
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
    filter: Filter[SdocColumns],
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
