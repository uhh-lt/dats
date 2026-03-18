import { QueryClient } from "@tanstack/react-query";
import { projectAspectsQueryOptions } from "../../_api/perspectivesQueryOptions";

interface PerspectivesListViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function perspectivesListViewLoader({ queryClient, projectId }: PerspectivesListViewLoaderArgs) {
  await queryClient.ensureQueryData(projectAspectsQueryOptions(projectId));
}
