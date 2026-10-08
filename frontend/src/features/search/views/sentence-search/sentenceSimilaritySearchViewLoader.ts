import { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions } from "../../_api/searchQueryOptions";
import { sentenceSimilarityQueries } from "./_api/sentenceSimilarityQueries";

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
      sentenceSimilarityQueries.search({
        projectId,
        searchQuery,
        filter: searchFilter,
        topK,
        threshold,
      }),
    ),
  ]);
}
