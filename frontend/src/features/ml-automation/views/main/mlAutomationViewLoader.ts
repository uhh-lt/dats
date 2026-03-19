import { QueryClient } from "@tanstack/react-query";
import { projectMLJobsQueryOptions } from "../../_api/mlAutomationQueryOptions";

interface MlAutomationViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function mlAutomationViewLoader({ queryClient, projectId }: MlAutomationViewLoaderArgs) {
  await queryClient.ensureQueryData(projectMLJobsQueryOptions(projectId));
}
