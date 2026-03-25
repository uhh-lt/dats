import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { MyFilter, deserializeFilterFromSearchParam } from "@core/filter";
import { QueryClient } from "@tanstack/react-query";
import { wordFrequencyTableQueryOptions } from "../../_api/wordFrequencyAnalysisQueryOptions";

interface WordFrequencyViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  searchFilter: string;
  sortingModel: { id: string; desc: boolean }[];
  pageSize: number;
}

export async function wordFrequencyViewLoader({
  queryClient,
  projectId,
  searchFilter,
  sortingModel,
  pageSize,
}: WordFrequencyViewLoaderArgs) {
  const filter = deserializeFilterFromSearchParam(searchFilter, "root") as MyFilter<WordFrequencyColumns>;

  await Promise.all([
    queryClient.prefetchInfiniteQuery(
      wordFrequencyTableQueryOptions({
        projectId,
        filter,
        sortingModel,
        pageSize,
      }),
    ),
  ]);
}
