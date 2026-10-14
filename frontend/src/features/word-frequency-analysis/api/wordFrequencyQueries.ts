import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { tableInfoQueries, toColumnInfos, type ColumnInfo, type MyFilter } from "@core/filter";
import { SortDirection } from "@models/SortDirection";
import { WordFrequencyColumns } from "@models/WordFrequencyColumns";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

interface WordFrequencyTableParams {
  projectId: number;
  filter: MyFilter<WordFrequencyColumns>;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
}

/**
 * Query factory for the word frequency analysis.
 *
 *   wordFrequencyQueries.all()             ["wordFrequency"]
 *   wordFrequencyQueries.table(params)     ["wordFrequency", "table", projectId, ...]
 */
export const wordFrequencyQueries = {
  all: () => ["wordFrequency"] as const,

  // the column infos of the word frequency filter
  tableInfo: (projectId: number, onLoaded?: (columnInfos: ColumnInfo[]) => void) =>
    queryOptions({
      queryKey: tableInfoQueries.bySlice("wordFrequency", projectId),
      queryFn: async () => {
        const columnInfos = toColumnInfos(await WordFrequencyService.wordFrequencyAnalysisInfo({ projectId }));
        onLoaded?.(columnInfos);
        return columnInfos;
      },
      staleTime: Infinity,
    }),

  tableScope: () => [...wordFrequencyQueries.all(), "table"] as const,
  table: ({ projectId, filter, sortingModel, fetchSize }: WordFrequencyTableParams) =>
    infiniteQueryOptions({
      queryKey: [...wordFrequencyQueries.tableScope(), projectId, filter, sortingModel, fetchSize] as const,
      queryFn: ({ pageParam }) =>
        WordFrequencyService.wordFrequencyAnalysis({
          projectId,
          requestBody: {
            filter,
            sorts: sortingModel.map((sort) => ({
              column: sort.id as WordFrequencyColumns,
              direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
            })),
          },
          page: pageParam,
          pageSize: fetchSize,
        }),
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }),
};
