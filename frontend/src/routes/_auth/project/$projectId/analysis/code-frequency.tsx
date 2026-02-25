import { createFileRoute } from "@tanstack/react-router";
import CodeFrequencyAnalysis from "../../../../../features/code-frequency-analysis/views/main/CodeFrequencyAnalysisView";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/code-frequency")({
  component: CodeFrequencyAnalysis,
});
