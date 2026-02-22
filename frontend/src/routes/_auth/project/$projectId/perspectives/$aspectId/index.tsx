import { createFileRoute } from "@tanstack/react-router";
import PerspectiveDashboard from "../../../../../../features/perspectives/views/dashboard/PerspectiveDashboardView.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/")({
  component: PerspectiveDashboard,
});
