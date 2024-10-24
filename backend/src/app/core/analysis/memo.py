from typing import List, Optional, Tuple

from app.core.data.dto.search import (
    ElasticSearchDocumentHit,
    PaginatedElasticSearchDocumentHits,
)
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.db.sql_service import SQLService
from app.core.filters.columns import (
    AbstractColumns,
    ColumnInfo,
)
from app.core.filters.filtering import Filter, apply_filtering
from app.core.filters.filtering_operators import FilterOperator, FilterValueType
from app.core.filters.pagination import apply_pagination
from app.core.filters.sorting import Sort, apply_sorting
from app.core.search.elasticsearch_service import ElasticSearchService


class MemoColumns(str, AbstractColumns):
    TITLE = "M_TITLE"
    CONTENT = "M_CONTENT"
    STARRED = "M_STARRED"
    # ATTACHED_TO = "M_ATTACHED_TO"
    USER_ID = "M_USER_ID"

    def get_filter_column(self, **kwargs):
        match self:
            case MemoColumns.TITLE:
                return MemoORM.title
            case MemoColumns.CONTENT:
                return MemoORM.content
            case MemoColumns.STARRED:
                return MemoORM.starred
            # case MemoColumns.ATTACHED_TO:
            #     return MemoORM.attached_to_id
            case MemoColumns.USER_ID:
                return MemoORM.user_id

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case MemoColumns.TITLE:
                return FilterOperator.STRING
            case MemoColumns.CONTENT:
                return FilterOperator.STRING
            case MemoColumns.STARRED:
                return FilterOperator.BOOLEAN
            # case MemoColumns.ATTACHED_TO:
            #     return FilterOperator.NUMBER
            case MemoColumns.USER_ID:
                return FilterOperator.ID

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case MemoColumns.TITLE:
                return FilterValueType.INFER_FROM_OPERATOR
            case MemoColumns.CONTENT:
                return FilterValueType.INFER_FROM_OPERATOR
            case MemoColumns.STARRED:
                return FilterValueType.INFER_FROM_OPERATOR
            case MemoColumns.USER_ID:
                return FilterValueType.USER_ID

    def get_sort_column(self, **kwargs):
        match self:
            case MemoColumns.TITLE:
                return MemoORM.title
            case MemoColumns.CONTENT:
                return MemoORM.content
            case MemoColumns.STARRED:
                return MemoORM.starred
            # case MemoColumns.ATTACHED_TO:
            #     return MemoORM.attached_to_id
            case MemoColumns.USER_ID:
                return MemoORM.user_id

    def get_label(self) -> str:
        match self:
            case MemoColumns.TITLE:
                return "Title"
            case MemoColumns.CONTENT:
                return "Content"
            case MemoColumns.STARRED:
                return "Starred"
            # case MemoColumns.ATTACHED_TO:
            #     return "Attached to"
            case MemoColumns.USER_ID:
                return "User"


def memo_info(
    project_id: int,
) -> List[ColumnInfo[MemoColumns]]:
    return [ColumnInfo[MemoColumns].from_column(column) for column in MemoColumns]


def __memo_filter(
    project_id: int,
    filter: Filter[MemoColumns],
    sorts: List[Sort[MemoColumns]],
    page_number: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Tuple[List[int], int]:
    with SQLService().db_session() as db:
        query = (
            db.query(
                MemoORM.id,
            )
            .join(MemoORM.attached_to)
            .filter(
                MemoORM.project_id == project_id,
                ObjectHandleORM.project_id.is_(None),  # never search project memos
            )
        )

        query = apply_filtering(query=query, filter=filter, db=db)

        if sorts is not None and len(sorts) > 0:
            query = apply_sorting(query=query, sorts=sorts, db=db)
        else:
            query = query.order_by(MemoORM.id.desc())

        if page_number is not None and page_size is not None:
            query, pagination = apply_pagination(
                query=query, page_number=page_number + 1, page_size=page_size
            )
            total_results = pagination.total_results
            memo_ids = [row[0] for row in query.all()]  # returns paginated results
        else:
            memo_ids = [row[0] for row in query.all()]  #  returns all results
            total_results = len(memo_ids)

        return memo_ids, total_results


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
        memo_ids, total_results = __memo_filter(
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
        filtered_memo_ids, _ = __memo_filter(
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
