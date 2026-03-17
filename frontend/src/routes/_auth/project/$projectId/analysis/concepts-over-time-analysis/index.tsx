import { CotaDashboardView } from "@features/concept-over-time-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    getTitle: () => "Concepts Over Time",
  },
  component: CotaDashboardView,
});
