import { QueryClient } from "@tanstack/react-query";
import { projectWhiteboardsQueryOptions } from "../../_api/whiteboardQueryOptions";

interface WhiteboardDashboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function whiteboardDashboardViewLoader({ queryClient, projectId }: WhiteboardDashboardViewLoaderArgs) {
  queryClient.ensureQueryData(projectWhiteboardsQueryOptions(projectId));
}
