import { QueryKey } from "@api/hooks/QueryKey";
import { SortDirection } from "@api/models/SortDirection";
import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { ColumnInfo, MyFilter, tableInfoQueryKey } from "@core/filter";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

interface WordFrequencyTableQueryOptionsArgs {
  projectId: number;
  filter: MyFilter<WordFrequencyColumns>;
  sortingModel: { id: string; desc: boolean }[];
  pageSize: number;
}

export const wordFrequencyTableQueryOptions = ({
  projectId,
  filter,
  sortingModel,
  pageSize,
}: WordFrequencyTableQueryOptionsArgs) =>
  infiniteQueryOptions({
    queryKey: [QueryKey.WORD_FREQUENCY_TABLE, projectId, filter, sortingModel, pageSize],
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
        pageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => groups.length,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

export const wordFrequencyTableInfoQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: tableInfoQueryKey("wordFrequency", projectId),
    queryFn: async () => {
      const result = await WordFrequencyService.wordFrequencyAnalysisInfo({ projectId });
      return result.map((info) => ({
        ...info,
        column: info.column.toString(),
      })) as ColumnInfo[];
    },
    staleTime: Infinity,
  });
