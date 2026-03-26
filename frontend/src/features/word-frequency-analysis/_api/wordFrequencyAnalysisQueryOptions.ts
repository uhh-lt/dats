import { QueryKey } from "@api/hooks/QueryKey";
import { SortDirection } from "@api/models/SortDirection";
import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { MyFilter } from "@core/filter";
import { infiniteQueryOptions } from "@tanstack/react-query";

const fetchSize = 50;

interface WordFrequencyTableQueryOptionsArgs {
  projectId: number;
  filter: MyFilter<WordFrequencyColumns>;
  sortingModel: { id: string; desc: boolean }[];
}

export const wordFrequencyTableQueryOptions = ({
  projectId,
  filter,
  sortingModel,
}: WordFrequencyTableQueryOptionsArgs) =>
  infiniteQueryOptions({
    queryKey: [QueryKey.WORD_FREQUENCY_TABLE, projectId, filter, sortingModel],
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
