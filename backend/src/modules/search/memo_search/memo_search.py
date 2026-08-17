from modules.search.memo_search.memo_search_columns import MemoColumns
from systems.search_system.column_info import ColumnInfo


def find_memo_info(project_id: int) -> list[ColumnInfo[MemoColumns]]:
    return [ColumnInfo[MemoColumns].from_column(column) for column in MemoColumns]
