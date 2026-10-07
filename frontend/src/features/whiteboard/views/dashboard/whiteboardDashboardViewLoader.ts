import { whiteboardQueries } from "@api/queries/whiteboardQueries";
import { QueryClient } from "@tanstack/react-query";

interface WhiteboardDashboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function whiteboardDashboardViewLoader({ queryClient, projectId }: WhiteboardDashboardViewLoaderArgs) {
  queryClient.ensureQueryData(whiteboardQueries.byProjectRequired(projectId));
}
