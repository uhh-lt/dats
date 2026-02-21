import { createFileRoute } from "@tanstack/react-router";
import CotaView from "../../../../../../features/analysis/ConceptsOverTime/CotaView.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/$cotaId")({
  params: {
    parse: ({ cotaId }) => ({ cotaId: parseInt(cotaId) }),
  },
  component: CotaView,
});
