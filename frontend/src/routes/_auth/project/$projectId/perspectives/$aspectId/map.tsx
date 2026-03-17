import { PerspectivesMapView } from "@features/perspectives";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/map")({
  staticData: {
    tab: true,
    icon: Icon.MAP,
    getTitle: (_, params) => `Map ${String(params?.aspectId ?? "")}`,
  },
  component: PerspectivesMapView,
});
