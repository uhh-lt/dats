import { QueryClient } from "@tanstack/react-query";
import { projectAspectsQueryOptions } from "../../_api/perspectivesQueryOptions";

interface PerspectivesMapViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  aspectId: number;
}

export async function perspectivesMapViewLoader({ queryClient, projectId, aspectId }: PerspectivesMapViewLoaderArgs) {
  const aspects = await queryClient.ensureQueryData(projectAspectsQueryOptions(projectId));
  const aspect = aspects[aspectId];
  if (!aspect) {
    throw new Error(`Aspect ${aspectId} not found in project ${projectId}`);
  }
  return aspect;
}
