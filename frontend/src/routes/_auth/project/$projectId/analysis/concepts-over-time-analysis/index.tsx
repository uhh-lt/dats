import { CotaDashboardView } from "@features/concept-over-time-analysis";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/")({
  component: CotaDashboardView,
});
