import { CodeFrequencyAnalysisView } from "@features/code-frequency-analysis";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/code-frequency")({
  component: CodeFrequencyAnalysisView,
});
