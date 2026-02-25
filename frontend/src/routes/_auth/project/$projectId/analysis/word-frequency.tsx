import { createFileRoute } from "@tanstack/react-router";
import WordFrequency from "../../../../../features/word-frequency-analysis/views/main/WordFrequencyView";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/word-frequency")({
  component: WordFrequency,
});
