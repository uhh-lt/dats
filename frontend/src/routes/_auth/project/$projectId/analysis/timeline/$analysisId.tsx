import { Icon } from "@components/icons";
import { TimelineAnalysisView, timelineAnalysisViewLoader } from "@features/timeline-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/$analysisId")({
  staticData: {
    tab: true,
    icon: Icon.TIMELINE_ANALYSIS,
    getTitle: (timeline: Awaited<ReturnType<typeof timelineAnalysisViewLoader>> | undefined) =>
      `Timeline ${String(timeline?.name ?? "")}`,
  },
  params: {
    parse: ({ analysisId }) => ({ analysisId: parseInt(analysisId) }),
  },
  loader: ({ context, params }) =>
    timelineAnalysisViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      analysisId: params.analysisId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: TimelineAnalysisView,
});
