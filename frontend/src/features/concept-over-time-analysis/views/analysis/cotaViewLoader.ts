import { QueryClient } from "@tanstack/react-query";
import { projectCotasQueryOptions } from "../../_api/cotaQueryOptions";

interface CotaViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  cotaId: number;
}

export async function cotaViewLoader({ queryClient, projectId, cotaId }: CotaViewLoaderArgs) {
  const cotaMap = await queryClient.ensureQueryData(projectCotasQueryOptions(projectId));
  return cotaMap[cotaId];
}
