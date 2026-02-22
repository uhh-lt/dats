import { createFileRoute } from "@tanstack/react-router";
import Map from "../../../../../../features/perspectives/views/map/PerspectivesMapView.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/map")({
  component: Map,
});
