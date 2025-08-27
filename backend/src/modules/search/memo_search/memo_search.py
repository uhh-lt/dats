from sqlalchemy.orm import Session

from core.memo.memo_elastic_crud import crud_elastic_memo
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_orm import ObjectHandleORM
from modules.search.memo_search.memo_search_columns import MemoColumns
from repos.elastic.elastic_dto_base import ElasticSearchHit, PaginatedElasticSearchHits
from repos.elastic.elastic_repo import ElasticSearchRepo
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.search_builder import SearchBuilder
from systems.search_system.sorting import Sort


def find_memo_info(
    project_id: int,
) -> list[ColumnInfo[MemoColumns]]:
    return [ColumnInfo[MemoColumns].from_column(column) for column in MemoColumns]


def filter_memo_ids(
    db: Session,
    project_id: int,
    filter: Filter[MemoColumns],
    sorts: list[Sort[MemoColumns]],
    page_number: int | None = None,
    page_size: int | None = None,
) -> tuple[list[int], int]:
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


def find_memos(
    db: Session,
    project_id: int,
    search_query: str,
    search_content: bool,
    filter: Filter[MemoColumns],
    sorts: list[Sort[MemoColumns]],
    page_number: int | None,
    page_size: int | None,
) -> PaginatedElasticSearchHits:
    if search_query.strip() == "":
        memo_ids, total_results = filter_memo_ids(
            db=db,
            project_id=project_id,
            filter=filter,
            page_number=page_number,
            page_size=page_size,
            sorts=sorts,
        )
        return PaginatedElasticSearchHits(
            hits=[ElasticSearchHit(id=memo_id) for memo_id in memo_ids],
            total_results=total_results,
        )
    else:
        filtered_memo_ids, _ = filter_memo_ids(
            db=db,
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
            return crud_elastic_memo.search_memos_by_content_query(
                client=ElasticSearchRepo().client,
                proj_id=project_id,
                query=search_query,
                memo_ids=set(filtered_memo_ids),
                skip=skip,
                limit=limit,
            )
        else:
            return crud_elastic_memo.search_memos_by_title_query(
                client=ElasticSearchRepo().client,
                proj_id=project_id,
                query=search_query,
                memo_ids=set(filtered_memo_ids),
                skip=skip,
                limit=limit,
            )
