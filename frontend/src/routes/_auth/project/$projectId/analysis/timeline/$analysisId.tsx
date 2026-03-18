import { TimelineAnalysisView, timelineAnalysisViewLoader } from "@features/timeline-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

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
  errorComponent: ({ error }) => <div>Failed to load timeline analysis: {(error as Error).message}</div>,
  component: TimelineAnalysisView,
});
