import { perspectiveQueries } from "@api/queries/perspectiveQueries";
import { QueryClient } from "@tanstack/react-query";

interface PerspectivesListViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function perspectivesListViewLoader({ queryClient, projectId }: PerspectivesListViewLoaderArgs) {
  await queryClient.ensureQueryData(perspectiveQueries.aspectsByProject(projectId));
}
