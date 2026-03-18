import { QueryClient } from "@tanstack/react-query";
import { projectAspectsQueryOptions } from "../../_api/perspectivesQueryOptions";

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
  const aspects = await queryClient.ensureQueryData(projectAspectsQueryOptions(projectId));
  const aspect = aspects[aspectId];
  if (!aspect) {
    throw new Error(`Aspect ${aspectId} not found in project ${projectId}`);
  }
  return aspect;
}
