import { SdocColumns } from "@api/models/SdocColumns";
import { deserializeFilterFromSearchParam, MyFilter } from "@core/filter";
import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions, searchTableInfoQueryOptions } from "../../_api/searchQueryOptions";
import { imageSimilaritySearchQueryOptions } from "./_api/imageSimilaritySearchQueryOptions";

interface ImageSimilaritySearchViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  searchQuery: string;
  searchFilter: string;
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
  const filter = deserializeFilterFromSearchParam(searchFilter, "imageSimilaritySearch") as ReturnType<
    typeof deserializeFilterFromSearchParam
  > as MyFilter<SdocColumns>;

  await Promise.all([
    queryClient.ensureQueryData(projectMetadataListQueryOptions(projectId)),
    queryClient.ensureQueryData(searchTableInfoQueryOptions(projectId)),
    queryClient.ensureQueryData(
      imageSimilaritySearchQueryOptions({
        projectId,
        searchQuery,
        filter,
        topK,
        threshold,
      }),
    ),
  ]);
}
