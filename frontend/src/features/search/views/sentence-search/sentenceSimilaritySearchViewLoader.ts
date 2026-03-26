import { SdocColumns } from "@api/models/SdocColumns";
import { MyFilter } from "@core/filter";
import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions } from "../../_api/searchQueryOptions";
import { sentenceSimilaritySearchQueryOptions } from "./_api/sentenceSimilaritySearchQueryOptions";

interface SentenceSimilaritySearchViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  searchQuery: string;
  searchFilter: MyFilter<SdocColumns>;
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
  await Promise.all([
    queryClient.ensureQueryData(projectMetadataListQueryOptions(projectId)),
    queryClient.ensureQueryData(
      sentenceSimilaritySearchQueryOptions({
        projectId,
        searchQuery,
        filter: searchFilter,
        topK,
        threshold,
      }),
    ),
  ]);
}
