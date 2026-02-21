import { createFileRoute } from "@tanstack/react-router";
import TimelineAnalysisDashboard from "../../../../../../features/analysis/TimelineAnalysis/TimelineAnalysisDashboard.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/")({
  component: TimelineAnalysisDashboard,
});
