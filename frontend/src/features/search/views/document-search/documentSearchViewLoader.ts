import { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions } from "../../_api/searchQueryOptions";
import { documentSearchQueryOptions } from "./_api/documentSearchQueryOptions";

interface DocumentSearchViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  searchQuery: string;
  searchFilter: MyFilter<SdocColumns>;
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
  await Promise.all([
    queryClient.ensureQueryData(projectMetadataListQueryOptions(projectId)),
    queryClient.prefetchInfiniteQuery(
      documentSearchQueryOptions({
        projectId,
        selectedFolderId,
        searchQuery,
        filter: searchFilter,
        expertMode,
        sortingModel,
        fetchSize,
      }),
    ),
  ]);
}
