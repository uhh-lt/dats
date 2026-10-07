import { perspectiveQueries } from "@api/queries/perspectiveQueries";
import { QueryClient } from "@tanstack/react-query";

interface PerspectivesMapViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  aspectId: number;
}

export async function perspectivesMapViewLoader({ queryClient, projectId, aspectId }: PerspectivesMapViewLoaderArgs) {
  const aspects = await queryClient.ensureQueryData(perspectiveQueries.aspectsByProject(projectId));
  const aspect = aspects[aspectId];
  if (!aspect) {
    throw new Error(`Aspect ${aspectId} not found in project ${projectId}`);
  }
  return aspect;
}
