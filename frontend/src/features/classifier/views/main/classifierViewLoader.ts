import { classifierQueries } from "@api/queries/classifierQueries";
import { jobQueries } from "@api/queries/jobQueries";
import { QueryClient } from "@tanstack/react-query";

interface ClassifierViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function classifierViewLoader({ queryClient, projectId }: ClassifierViewLoaderArgs) {
  await Promise.all([
    queryClient.ensureQueryData(classifierQueries.byProject(projectId)),
    queryClient.ensureQueryData(jobQueries.classifier.byProject(projectId)),
  ]);
}
