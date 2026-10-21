import { Icon } from "@components/icons";
import { AnalysisOverviewView } from "@features/analysis-overview";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/")({
  staticData: {
    tab: true,
    icon: Icon.ANALYSIS,
    getTitle: () => "Analysis",
  },
  component: AnalysisOverviewView,
});
