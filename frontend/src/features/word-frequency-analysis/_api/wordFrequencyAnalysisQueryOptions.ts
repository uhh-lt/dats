import { QueryKey } from "@api/hooks/QueryKey";
import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { MyFilter } from "@core/filter";
import { SortDirection } from "@models/SortDirection";
import { WordFrequencyColumns } from "@models/WordFrequencyColumns";
import { infiniteQueryOptions } from "@tanstack/react-query";

interface WordFrequencyTableQueryOptionsArgs {
  projectId: number;
  filter: MyFilter<WordFrequencyColumns>;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
}

export const wordFrequencyTableQueryOptions = ({
  projectId,
  filter,
  sortingModel,
  fetchSize,
}: WordFrequencyTableQueryOptionsArgs) =>
  infiniteQueryOptions({
    queryKey: [QueryKey.WORD_FREQUENCY_TABLE, projectId, filter, sortingModel, fetchSize],
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
  });
