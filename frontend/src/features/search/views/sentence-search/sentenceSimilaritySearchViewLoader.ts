import { SdocColumns } from "@api/models/SdocColumns";
import { MyFilter, deserializeFilterFromSearchParam } from "@core/filter";
import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions, searchTableInfoQueryOptions } from "../../_api/searchQueryOptions";
import { sentenceSimilaritySearchQueryOptions } from "./_api/sentenceSimilaritySearchQueryOptions";

interface SentenceSimilaritySearchViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  searchQuery: string;
  searchFilter: string;
  topK: number;
  threshold: number;
}

export async function sentenceSimilaritySearchViewLoader({
  queryClient,
  projectId,
  searchQuery,
  searchFilter,
  topK,
  threshold,
}: SentenceSimilaritySearchViewLoaderArgs) {
  const filter = deserializeFilterFromSearchParam(searchFilter, "sentenceSimilaritySearch") as MyFilter<SdocColumns>;

  await Promise.all([
    queryClient.ensureQueryData(projectMetadataListQueryOptions(projectId)),
    queryClient.ensureQueryData(searchTableInfoQueryOptions(projectId)),
    queryClient.ensureQueryData(
      sentenceSimilaritySearchQueryOptions({
        projectId,
        searchQuery,
        filter,
        topK,
        threshold,
      }),
    ),
  ]);
}
