import { PerspectiveDashboardView } from "@features/perspectives";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/")({
  staticData: {
    tab: true,
    icon: Icon.MAP,
    getTitle: (_, params) => `Aspect ${String(params?.aspectId ?? "")}`,
  },
  component: PerspectiveDashboardView,
});
