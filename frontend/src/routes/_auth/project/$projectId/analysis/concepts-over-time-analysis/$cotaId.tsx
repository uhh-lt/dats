import { CotaView } from "@features/concept-over-time-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/$cotaId")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    getTitle: (_, params) => `COTA ${String(params?.cotaId ?? "")}`,
  },
  params: {
    parse: ({ cotaId }) => ({ cotaId: parseInt(cotaId) }),
  },
  component: CotaView,
});
