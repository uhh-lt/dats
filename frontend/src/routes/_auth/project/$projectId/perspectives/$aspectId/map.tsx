import { PerspectivesMapView } from "@features/perspectives";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/map")({
  component: PerspectivesMapView,
});
