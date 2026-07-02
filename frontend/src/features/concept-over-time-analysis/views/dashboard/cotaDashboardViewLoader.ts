import { QueryClient } from "@tanstack/react-query";
import { projectCotasQueryOptions } from "../../_api/cotaQueryOptions";

interface CotaDashboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function cotaDashboardViewLoader({ queryClient, projectId }: CotaDashboardViewLoaderArgs) {
  queryClient.ensureQueryData(projectCotasQueryOptions(projectId));
}
