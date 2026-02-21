import { createFileRoute } from "@tanstack/react-router";
import CodeFrequencyAnalysis from "../../../../../features/analysis/CodeFrequency/CodeFrequencyAnalysis.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/code-frequency")({
  component: CodeFrequencyAnalysis,
});
