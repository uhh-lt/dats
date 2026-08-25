from sqlalchemy.orm import Session

from core.memo.memo_dto import AttachedObjectType, MemoRead
from modules.search.memo_search.memo_search_columns import (
    MemoColumns,
    build_memo_subquery,
)
from modules.search.search_dto import Page, QueryRequest
from systems.search_system.column_info import ColumnInfo
from systems.search_system.grouping import GroupPage, GroupQueryRequest, GroupSummary
from systems.search_system.search_builder import SearchBuilder


def find_memo_info(project_id: int) -> list[ColumnInfo[MemoColumns]]:
    return [ColumnInfo[MemoColumns].from_column(column) for column in MemoColumns]


def _apply_title_and_content_search(query, subquery_dict, search_query: str):
    normalized_query = search_query.strip()
    if normalized_query == "":
        return query

    pattern = f"%{normalized_query}%"
    return query.filter(
        subquery_dict[MemoColumns.TITLE.value].ilike(pattern)
        | subquery_dict[MemoColumns.CONTENT.value].ilike(pattern)
    )


def _to_row(data) -> MemoRead:
    return MemoRead(
        id=data["id"],
        title=data[MemoColumns.TITLE.value],
        icon=data["icon"],
        content=data[MemoColumns.CONTENT.value],
        content_json=data["content_json"],
        user_id=data[MemoColumns.USER_ID.value],
        project_id=data["project_id"],
        created=data[MemoColumns.CREATED.value],
        updated=data[MemoColumns.UPDATED.value],
        is_favorite=data[MemoColumns.FAVORITE.value],
        attached_object_id=data[MemoColumns.ATTACHED_OBJECT_ID.value],
        attached_object_type=AttachedObjectType(
            data[MemoColumns.ATTACHED_OBJECT_TYPE.value]
        ),
    )


def find_memos(
    db: Session, *, request: QueryRequest[MemoColumns], user_id: int
) -> Page[MemoRead]:
    """Row query: filter/sort/search/drill-down/paginate memos -> Page[MemoRead].

    The SearchBuilder applies filtering + sorting + pagination and returns paginated
    memo IDs; the projection is then re-run restricted to those IDs to resolve the
    human-readable labels, and reordered to match the paginated order.
    """
    builder = SearchBuilder(
        db=db,
        filter=request.filter,
        sorts=request.sorts,
        group_by=request.group_by,
        group_key=request.group_key,
        user_id=user_id,
    )
    builder.init_subquery(
        build_memo_subquery(db, project_id=request.project_id, user_id=user_id)
    )
    subquery = builder.build_subquery()
    builder.init_query(db.query(subquery.c.id))
    query = builder.build_query()

    # full-text search on title/content
    query = _apply_title_and_content_search(query, subquery.c, request.search_query)

    # default sort: most recently updated first
    if len(request.sorts) == 0:
        query = query.order_by(
            subquery.c[MemoColumns.UPDATED.value].desc(), subquery.c.id.desc()
        )

    builder.query = query
    rows, total_results = builder.execute_query(
        page_number=request.page_number, page_size=request.page_size
    )
    memo_ids = [row[0] for row in rows]

    if len(memo_ids) == 0:
        return Page[MemoRead](items=[], total_results=total_results)

    # Re-run the projection restricted to the page's memo IDs to resolve the
    # human-readable labels, then reorder to match the paginated order.
    projection = build_memo_subquery(
        db, project_id=request.project_id, user_id=user_id
    ).subquery()
    summary_rows = db.query(*projection.c).filter(projection.c.id.in_(memo_ids)).all()
    summaries_by_id = {
        row._mapping["id"]: _to_row(row._mapping) for row in summary_rows
    }
    items = [
        summaries_by_id[memo_id] for memo_id in memo_ids if memo_id in summaries_by_id
    ]

    return Page[MemoRead](items=items, total_results=total_results)


def find_memo_groups(
    db: Session, *, request: GroupQueryRequest[MemoColumns], user_id: int
) -> GroupPage:
    """Group query: aggregate memos by a column -> paginated GroupPage.

    The SearchBuilder grouping branch returns aggregate rows
    (group_key, group_label, total_results, target_id, target_type) directly.
    """
    builder = SearchBuilder(
        db=db,
        filter=request.filter,
        sorts=[],
        group_by=request.group_by,
        user_id=user_id,
    )
    builder.init_subquery(
        build_memo_subquery(db, project_id=request.project_id, user_id=user_id)
    )
    subquery = builder.build_subquery()
    builder.init_query(db.query(subquery.c.id))
    query = builder.build_query()

    # full-text search on title/content
    query = _apply_title_and_content_search(query, subquery.c, request.search_query)

    builder.query = query
    rows, total_results = builder.execute_query(
        page_number=request.page_number, page_size=request.page_size
    )

    groups = []
    for row in rows:
        data = row._mapping
        groups.append(
            GroupSummary(
                key=data["group_key"],
                label=data["group_label"],
                total_results=data["total_results"],
                target_id=data.get("target_id"),
                target_type=data.get("target_type"),
            )
        )

    return GroupPage(items=groups, total_results=total_results)
