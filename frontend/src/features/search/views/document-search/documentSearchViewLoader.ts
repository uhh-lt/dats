import { QueryClient } from "@tanstack/react-query";
import { projectMetadataListQueryOptions, searchTableInfoQueryOptions } from "../../_api/searchQueryOptions";

interface DocumentSearchViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function documentSearchViewLoader({ queryClient, projectId }: DocumentSearchViewLoaderArgs) {
  await Promise.all([
    queryClient.ensureQueryData(projectMetadataListQueryOptions(projectId)),
    queryClient.ensureQueryData(searchTableInfoQueryOptions(projectId)),
  ]);
}
