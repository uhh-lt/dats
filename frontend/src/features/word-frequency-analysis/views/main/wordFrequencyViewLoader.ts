import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { deserializeFilterFromSearchParam } from "@core/filter";
import { QueryClient } from "@tanstack/react-query";
import { wordFrequencyTableQueryOptions } from "../../_api/wordFrequencyAnalysisQueryOptions";

interface WordFrequencyViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  searchFilter: string;
  sortingModel: { id: string; desc: boolean }[];
}

export async function wordFrequencyViewLoader({
  queryClient,
  projectId,
  searchFilter,
  sortingModel,
}: WordFrequencyViewLoaderArgs) {
  const filter = deserializeFilterFromSearchParam<WordFrequencyColumns>(searchFilter, "root");

  await Promise.all([
    queryClient.prefetchInfiniteQuery(
      wordFrequencyTableQueryOptions({
        projectId,
        filter,
        sortingModel,
      }),
    ),
  ]);
}
