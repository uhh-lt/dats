import { TimelineAnalysisView } from "@features/timeline-analysis";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/$analysisId")({
  params: {
    parse: ({ analysisId }) => ({ analysisId: parseInt(analysisId) }),
  },
  component: TimelineAnalysisView,
});
