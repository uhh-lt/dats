import { CodeFrequencyAnalysisView } from "@features/code-frequency-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/code-frequency")({
  staticData: {
    tab: true,
    icon: Icon.CODE_FREQUENCY,
    getTitle: () => "Code Frequency",
  },
  component: CodeFrequencyAnalysisView,
});
