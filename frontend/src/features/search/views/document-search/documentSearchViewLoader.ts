import { SdocColumns } from "@api/models/SdocColumns";
import { MyFilter, deserializeFilterFromSearchParam } from "@core/filter";
import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions, searchTableInfoQueryOptions } from "../../_api/searchQueryOptions";
import { documentSearchQueryOptions } from "./_api/documentSearchQueryOptions";

interface DocumentSearchViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  searchQuery: string;
  searchFilter: string;
  expertMode: boolean;
  selectedFolderId: number;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
}

export async function documentSearchViewLoader({
  queryClient,
  projectId,
  searchQuery,
  searchFilter,
  expertMode,
  selectedFolderId,
  sortingModel,
  fetchSize,
}: DocumentSearchViewLoaderArgs) {
  const filter = deserializeFilterFromSearchParam(searchFilter, "root") as MyFilter<SdocColumns>;

  await Promise.all([
    queryClient.ensureQueryData(projectMetadataListQueryOptions(projectId)),
    queryClient.ensureQueryData(searchTableInfoQueryOptions(projectId)),
    queryClient.prefetchInfiniteQuery(
      documentSearchQueryOptions({
        projectId,
        selectedFolderId,
        searchQuery,
        filter,
        expertMode,
        sortingModel,
        fetchSize,
      }),
    ),
  ]);
}
