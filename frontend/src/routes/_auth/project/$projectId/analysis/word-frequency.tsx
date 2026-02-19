import { createFileRoute } from "@tanstack/react-router";
import WordFrequency from "../../../../../views/analysis/WordFrequency/WordFrequency.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/word-frequency")({
  component: WordFrequency,
});
