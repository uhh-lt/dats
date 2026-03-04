import { TimelineAnalysisDashboardView } from "@features/timeline-analysis";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/")({
  component: TimelineAnalysisDashboardView,
});
