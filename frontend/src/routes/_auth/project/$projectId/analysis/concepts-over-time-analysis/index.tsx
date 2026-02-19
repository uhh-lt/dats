import { createFileRoute } from "@tanstack/react-router";
import CotaDashboard from "../../../../../../views/analysis/ConceptsOverTime/CotaDashboard.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/")({
  component: CotaDashboard,
});
