import { Icon } from "@components/icons";
import { TimelineAnalysisDashboardView, timelineAnalysisQueries } from "@features/timeline-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/")({
  staticData: {
    tab: true,
    icon: Icon.TIMELINE_ANALYSIS,
    getTitle: () => "Timeline Analysis",
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ timelineAnalysesByProjectOptions: timelineAnalysisQueries.byProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.timelineAnalysesByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: TimelineAnalysisDashboardView,
});
