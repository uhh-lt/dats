import { createFileRoute } from "@tanstack/react-router";
import Perspectives from "../../../../../features/perspectives/views/list/PerspectivesListView";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/")({
  component: Perspectives,
});
