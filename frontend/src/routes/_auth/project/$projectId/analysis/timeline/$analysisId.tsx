import { createFileRoute } from "@tanstack/react-router";
import TimelineAnalysis from "../../../../../../views/analysis/TimelineAnalysis/TimelineAnalysis.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/$analysisId")({
  params: {
    parse: ({ analysisId }) => ({ analysisId: parseInt(analysisId) }),
  },
  component: TimelineAnalysis,
});
