import { TimelineAnalysisView } from "@features/timeline-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/$analysisId")({
  staticData: {
    tab: true,
    icon: Icon.TIMELINE_ANALYSIS,
    getTitle: (_, params) => `Timeline ${String(params?.analysisId ?? "")}`,
  },
  params: {
    parse: ({ analysisId }) => ({ analysisId: parseInt(analysisId) }),
  },
  component: TimelineAnalysisView,
});
