import { Icon } from "@components/icons";
import { parseIdParam } from "@core/navigation";
import { timelineAnalysisQueries, TimelineAnalysisView } from "@features/timeline-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/$analysisId")({
  staticData: {
    tab: true,
    icon: Icon.TIMELINE_ANALYSIS,
    getTitle: ({ queryClient, params }) => {
      const timelines = queryClient.getQueryData(timelineAnalysisQueries.byProject(Number(params.projectId)).queryKey);
      return `Timeline ${timelines?.[Number(params.analysisId)]?.name ?? ""}`;
    },
  },
  params: {
    parse: ({ analysisId }) => ({ analysisId: parseIdParam(analysisId) }),
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ timelineAnalysesByProjectOptions: timelineAnalysisQueries.byProject(params.projectId) }),
  loader: async ({ context, params }) => {
    const timelineAnalyses = await context.queryClient.ensureQueryData(context.timelineAnalysesByProjectOptions);
    if (!timelineAnalyses[params.analysisId]) throw notFound();
  },
  pendingComponent: () => <CircularProgress />,
  component: TimelineAnalysisView,
});
