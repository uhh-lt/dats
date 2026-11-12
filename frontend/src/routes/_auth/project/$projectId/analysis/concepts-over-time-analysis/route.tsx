import { Feature } from "@models/Feature";
import { createFileRoute } from "@tanstack/react-router";

// the feature of the concepts over time pages: the dashboard and each analysis inherit it
export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis")({
  staticData: {
    feature: Feature.CONCEPTS_OVER_TIME,
  },
});
