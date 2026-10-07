import { projectQueries } from "@api/queries/projectQueries";
import { QueryClient } from "@tanstack/react-query";

interface ProjectsViewLoaderArgs {
  queryClient: QueryClient;
}

export async function projectsViewLoader({ queryClient }: ProjectsViewLoaderArgs) {
  await queryClient.ensureQueryData(projectQueries.userProjects());
}
