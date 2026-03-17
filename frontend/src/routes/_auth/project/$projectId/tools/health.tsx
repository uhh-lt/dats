import { HealthView } from "@features/health";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/tools/health")({
  staticData: {
    tab: true,
    icon: Icon.HEALTH,
    getTitle: () => "Health",
  },
  component: HealthView,
});
