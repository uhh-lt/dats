import { userProjectsQueryOptions } from "@api/hooks/ProjectHooks";
import { QueryClient } from "@tanstack/react-query";

interface ProjectsViewLoaderArgs {
  queryClient: QueryClient;
}

export async function projectsViewLoader({ queryClient }: ProjectsViewLoaderArgs) {
  await queryClient.ensureQueryData(userProjectsQueryOptions());
}
