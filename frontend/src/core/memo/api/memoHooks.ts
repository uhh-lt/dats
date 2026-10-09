import { SearchService } from "@api/services/SearchService";
import { ColumnInfo, tableInfoQueries } from "@core/filter";
import { useQuery } from "@tanstack/react-query";

// MEMO QUERIES
// Memo queries (detail, attached, recent, search, groups, table) live in memoQueries and are used with
// `useQuery`/`useInfiniteQuery` directly. Only the column-info query below is still defined here (stage 4).

/**
 * Fetches the memo column info (label, sortable, filter operator, filter value type)
 * from the backend memo search info endpoint.
 *
 * Returns a map from column id to ColumnInfo. This is the single source of truth
 * for which filters/operators are available on memo columns - do not hardcode
 * column info in views.
 */
export const useMemoSearchInfo = (projectId: number) =>
  useQuery<Record<string, ColumnInfo>>({
    queryKey: tableInfoQueries.bySlice("memoFilter", projectId),
    queryFn: async () => {
      const result = await SearchService.searchMemoInfo({ projectId });
      return result.reduce<Record<string, ColumnInfo>>((acc, info) => {
        const column = info.column.toString();
        acc[column] = { ...info, column };
        return acc;
      }, {});
    },
    staleTime: Infinity,
  });
