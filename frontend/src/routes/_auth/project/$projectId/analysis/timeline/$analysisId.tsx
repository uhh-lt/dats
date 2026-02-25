import { createFileRoute } from "@tanstack/react-router";
import TimelineAnalysis from "../../../../../../features/timeline-analysis/views/analysis/TimelineAnalysisView";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/$analysisId")({
  params: {
    parse: ({ analysisId }) => ({ analysisId: parseInt(analysisId) }),
  },
  component: TimelineAnalysis,
});
