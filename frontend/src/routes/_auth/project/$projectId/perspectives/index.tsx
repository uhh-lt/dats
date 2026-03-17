import { PerspectivesListView } from "@features/perspectives";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/")({
  component: PerspectivesListView,
});
