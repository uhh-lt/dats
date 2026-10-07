import { timelineAnalysisQueries } from "@api/queries/timelineAnalysisQueries";
import { QueryClient } from "@tanstack/react-query";

interface TimelineAnalysisDashboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function timelineAnalysisDashboardViewLoader({
  queryClient,
  projectId,
}: TimelineAnalysisDashboardViewLoaderArgs) {
  queryClient.ensureQueryData(timelineAnalysisQueries.byProject(projectId));
}
