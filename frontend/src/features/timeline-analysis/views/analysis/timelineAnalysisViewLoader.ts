import { QueryClient } from "@tanstack/react-query";
import { projectTimelineAnalysisQueryOptions } from "../../_api/timelineAnalysisQueryOptions";

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
  const timelineMap = await queryClient.ensureQueryData(projectTimelineAnalysisQueryOptions(projectId));
  return timelineMap[analysisId];
}
