import { PerspectivesListView } from "@features/perspectives";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/")({
  staticData: {
    tab: true,
    icon: Icon.PERSPECTIVES,
    getTitle: () => "Perspectives",
  },
  component: PerspectivesListView,
});
