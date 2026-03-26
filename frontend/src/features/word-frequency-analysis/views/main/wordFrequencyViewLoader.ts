import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { MyFilter } from "@core/filter";
import { QueryClient } from "@tanstack/react-query";
import { wordFrequencyTableQueryOptions } from "../../_api/wordFrequencyAnalysisQueryOptions";

interface WordFrequencyViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  searchFilter: MyFilter<WordFrequencyColumns>;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
}

export async function wordFrequencyViewLoader({
  queryClient,
  projectId,
  searchFilter,
  sortingModel,
  fetchSize,
}: WordFrequencyViewLoaderArgs) {
  await Promise.all([
    queryClient.prefetchInfiniteQuery(
      wordFrequencyTableQueryOptions({
        projectId,
        filter: searchFilter,
        sortingModel,
        fetchSize,
      }),
    ),
  ]);
}
