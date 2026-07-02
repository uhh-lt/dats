import { Icon } from "@components/icons";
import { TimelineAnalysisDashboardView, timelineAnalysisDashboardViewLoader } from "@features/timeline-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/")({
  staticData: {
    tab: true,
    icon: Icon.TIMELINE_ANALYSIS,
    getTitle: () => "Timeline Analysis",
  },
  loader: ({ context, params }) =>
    timelineAnalysisDashboardViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: TimelineAnalysisDashboardView,
});
