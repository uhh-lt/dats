import { cotaQueries } from "@api/queries/cotaQueries";
import { QueryClient } from "@tanstack/react-query";

interface CotaDashboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function cotaDashboardViewLoader({ queryClient, projectId }: CotaDashboardViewLoaderArgs) {
  queryClient.ensureQueryData(cotaQueries.byProject(projectId));
}
