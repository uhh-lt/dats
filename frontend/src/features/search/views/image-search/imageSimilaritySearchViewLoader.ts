import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions, searchTableInfoQueryOptions } from "../../_api/searchQueryOptions";

interface ImageSimilaritySearchViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function imageSimilaritySearchViewLoader({ queryClient, projectId }: ImageSimilaritySearchViewLoaderArgs) {
  await Promise.all([
    queryClient.ensureQueryData(projectMetadataListQueryOptions(projectId)),
    queryClient.ensureQueryData(searchTableInfoQueryOptions(projectId)),
  ]);
}
