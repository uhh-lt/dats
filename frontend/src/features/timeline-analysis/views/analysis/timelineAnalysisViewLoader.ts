import { timelineAnalysisQueries } from "@api/queries/timelineAnalysisQueries";
import { QueryClient } from "@tanstack/react-query";

interface TimelineAnalysisViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  analysisId: number;
}

export async function timelineAnalysisViewLoader({
  queryClient,
  projectId,
  analysisId,
}: TimelineAnalysisViewLoaderArgs) {
  const timelineMap = await queryClient.ensureQueryData(timelineAnalysisQueries.byProject(projectId));
  return timelineMap[analysisId];
}
