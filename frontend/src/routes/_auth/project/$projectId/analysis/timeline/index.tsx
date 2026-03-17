import { TimelineAnalysisDashboardView } from "@features/timeline-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/timeline/")({
  staticData: {
    tab: true,
    icon: Icon.TIMELINE_ANALYSIS,
    getTitle: () => "Timeline",
  },
  component: TimelineAnalysisDashboardView,
});
