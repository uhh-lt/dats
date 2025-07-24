from typing import List, Optional, Tuple

from core.memo.memo_orm import MemoORM
from core.memo.object_handle_orm import ObjectHandleORM
from modules.search.memo_search.memo_search_columns import MemoColumns
from modules.search.search_dto import (
    ElasticSearchDocumentHit,
    PaginatedElasticSearchDocumentHits,
)
from modules.search_system.column_info import ColumnInfo
from modules.search_system.filtering import Filter
from modules.search_system.search_builder import SearchBuilder
from modules.search_system.sorting import Sort
from repos.db.sql_repo import SQLRepo
from repos.elasticsearch_repo import ElasticSearchRepo


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
    with SQLRepo().db_session() as db:
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
            hits=[ElasticSearchDocumentHit(id=memo_id) for memo_id in memo_ids],
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
            return ElasticSearchRepo().search_memos_by_content_query(
                proj_id=project_id,
                query=search_query,
                memo_ids=set(filtered_memo_ids),
                skip=skip,
                limit=limit,
            )
        else:
            return ElasticSearchRepo().search_memos_by_title_query(
                proj_id=project_id,
                query=search_query,
                memo_ids=set(filtered_memo_ids),
                skip=skip,
                limit=limit,
            )
