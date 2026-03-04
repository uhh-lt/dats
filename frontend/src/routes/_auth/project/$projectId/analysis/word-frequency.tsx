import { WordFrequencyView } from "@features/word-frequency-analysis";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/word-frequency")({
  component: WordFrequencyView,
});
