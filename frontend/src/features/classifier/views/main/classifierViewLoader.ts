import { QueryClient } from "@tanstack/react-query";
import { projectClassifierJobsQueryOptions, projectClassifiersQueryOptions } from "../../_api/classifierQueryOptions";

interface ClassifierViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function classifierViewLoader({ queryClient, projectId }: ClassifierViewLoaderArgs) {
  await Promise.all([
    queryClient.ensureQueryData(projectClassifiersQueryOptions(projectId)),
    queryClient.ensureQueryData(projectClassifierJobsQueryOptions(projectId)),
  ]);
}
