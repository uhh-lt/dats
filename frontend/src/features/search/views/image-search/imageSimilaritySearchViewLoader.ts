import { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions } from "../../_api/searchQueryOptions";
import { imageSimilaritySearchQueryOptions } from "./_api/imageSimilaritySearchQueryOptions";

interface ImageSimilaritySearchViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  searchQuery: string;
  searchFilter: MyFilter<SdocColumns>;
  topK: number;
  threshold: number;
}

export async function imageSimilaritySearchViewLoader({
  queryClient,
  projectId,
  searchQuery,
  searchFilter,
  topK,
  threshold,
}: ImageSimilaritySearchViewLoaderArgs) {
  await Promise.all([
    queryClient.ensureQueryData(projectMetadataListQueryOptions(projectId)),
    queryClient.ensureQueryData(
      imageSimilaritySearchQueryOptions({
        projectId,
        searchQuery,
        filter: searchFilter,
        topK,
        threshold,
      }),
    ),
  ]);
}
