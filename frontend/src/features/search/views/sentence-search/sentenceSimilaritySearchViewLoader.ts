import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions, searchTableInfoQueryOptions } from "../../_api/searchQueryOptions";

interface SentenceSimilaritySearchViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function sentenceSimilaritySearchViewLoader({
  queryClient,
  projectId,
}: SentenceSimilaritySearchViewLoaderArgs) {
  await Promise.all([
    queryClient.ensureQueryData(projectMetadataListQueryOptions(projectId)),
    queryClient.ensureQueryData(searchTableInfoQueryOptions(projectId)),
  ]);
}
