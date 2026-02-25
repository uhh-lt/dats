import { createFileRoute } from "@tanstack/react-router";
import TimelineAnalysisDashboard from "../../../../../../features/timeline-analysis/views/dashboard/TimelineAnalysisDashboardView";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/")({
  component: TimelineAnalysisDashboard,
});
