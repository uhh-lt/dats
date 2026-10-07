import { cotaQueries } from "@api/queries/cotaQueries";
import { QueryClient } from "@tanstack/react-query";

interface CotaViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  cotaId: number;
}

export async function cotaViewLoader({ queryClient, projectId, cotaId }: CotaViewLoaderArgs) {
  const cotaMap = await queryClient.ensureQueryData(cotaQueries.byProjectRequired(projectId));
  return cotaMap[cotaId];
}
