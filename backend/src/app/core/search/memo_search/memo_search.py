from typing import List, Optional, Tuple

from app.core.data.dto.search import (
    ElasticSearchDocumentHit,
    PaginatedElasticSearchDocumentHits,
)
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.db.elasticsearch_service import ElasticSearchService
from app.core.db.sql_service import SQLService
from app.core.search.column_info import (
    ColumnInfo,
)
from app.core.search.filtering import Filter
from app.core.search.memo_search.memo_search_columns import MemoColumns
from app.core.search.search_builder import SearchBuilder
from app.core.search.sorting import Sort


def memo_info(
    project_id: int,
) -> List[ColumnInfo[MemoColumns]]:
    return [ColumnInfo[MemoColumns].from_column(column) for column in MemoColumns]


def filter_memo_ids(
    project_id: int,
    filter: Filter[MemoColumns],
    sorts: List[Sort[MemoColumns]],
    page_number: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Tuple[List[int], int]:
    with SQLService().db_session() as db:
        builder = SearchBuilder(db=db, filter=filter, sorts=sorts)
        builder.init_query(
            db.query(
                MemoORM.id,
            )
            .join(MemoORM.attached_to)
            .filter(
                MemoORM.project_id == project_id,
                ObjectHandleORM.project_id.is_(None),  # never search project memos
            )
        ).build_query()
        result_rows, total_results = builder.execute_query(
            page_number=page_number, page_size=page_size
        )

        return [row[0] for row in result_rows], total_results


def memo_search(
    project_id: int,
    search_query: str,
    search_content: bool,
    filter: Filter[MemoColumns],
    sorts: List[Sort[MemoColumns]],
    page_number: Optional[int],
    page_size: Optional[int],
) -> PaginatedElasticSearchDocumentHits:
    if search_query.strip() == "":
        memo_ids, total_results = filter_memo_ids(
            project_id=project_id,
            filter=filter,
            page_number=page_number,
            page_size=page_size,
            sorts=sorts,
        )
        return PaginatedElasticSearchDocumentHits(
            hits=[
                ElasticSearchDocumentHit(document_id=memo_id) for memo_id in memo_ids
            ],
            total_results=total_results,
        )
    else:
        filtered_memo_ids, _ = filter_memo_ids(
            project_id=project_id,
            filter=filter,
            sorts=sorts,
        )
        # use elasticseach for full text search
        if page_number is not None and page_size is not None:
            skip = page_number * page_size
            limit = page_size
        else:
            skip = None
            limit = None

        if search_content:
            return ElasticSearchService().search_memos_by_content_query(
                proj_id=project_id,
                query=search_query,
                memo_ids=set(filtered_memo_ids),
                skip=skip,
                limit=limit,
            )
        else:
            return ElasticSearchService().search_memos_by_title_query(
                proj_id=project_id,
                query=search_query,
                memo_ids=set(filtered_memo_ids),
                skip=skip,
                limit=limit,
            )
