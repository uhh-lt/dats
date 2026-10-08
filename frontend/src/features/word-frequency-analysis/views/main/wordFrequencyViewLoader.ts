import { MyFilter } from "@core/filter";
import { WordFrequencyColumns } from "@models/WordFrequencyColumns";
import { QueryClient } from "@tanstack/react-query";
import { wordFrequencyQueries } from "../../_api/wordFrequencyQueries";

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
      wordFrequencyQueries.table({
        projectId,
        filter: searchFilter,
        sortingModel,
        fetchSize,
      }),
    ),
  ]);
}
