import { QueryClient } from "@tanstack/react-query";
import { projectTimelineAnalysisQueryOptions } from "../../_api/timelineAnalysisQueryOptions";

interface TimelineAnalysisDashboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
}

export async function timelineAnalysisDashboardViewLoader({
  queryClient,
  projectId,
}: TimelineAnalysisDashboardViewLoaderArgs) {
  queryClient.ensureQueryData(projectTimelineAnalysisQueryOptions(projectId));
}
