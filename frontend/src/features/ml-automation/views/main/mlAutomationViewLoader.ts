import { jobQueries } from "@api/queries/jobQueries";
import { QueryClient } from "@tanstack/react-query";

interface MlAutomationViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function mlAutomationViewLoader({ queryClient, projectId }: MlAutomationViewLoaderArgs) {
  await queryClient.ensureQueryData(jobQueries.ml.byProject(projectId));
}
