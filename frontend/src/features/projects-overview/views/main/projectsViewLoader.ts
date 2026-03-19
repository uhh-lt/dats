import { QueryClient } from "@tanstack/react-query";
import { userProjectsQueryOptions } from "../../_api/projectsOverviewQueryOptions";

interface ProjectsViewLoaderArgs {
  queryClient: QueryClient;
}

export async function projectsViewLoader({ queryClient }: ProjectsViewLoaderArgs) {
  await queryClient.ensureQueryData(userProjectsQueryOptions());
}
