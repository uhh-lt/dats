import { perspectiveQueries } from "@api/queries/perspectiveQueries";
import { QueryClient } from "@tanstack/react-query";

interface PerspectiveDashboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  aspectId: number;
}

export async function perspectiveDashboardViewLoader({
  queryClient,
  projectId,
  aspectId,
}: PerspectiveDashboardViewLoaderArgs) {
  const aspects = await queryClient.ensureQueryData(perspectiveQueries.aspectsByProject(projectId));
  const aspect = aspects[aspectId];
  if (!aspect) {
    throw new Error(`Aspect ${aspectId} not found in project ${projectId}`);
  }
  return aspect;
}
