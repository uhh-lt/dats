import { createFileRoute } from "@tanstack/react-router";
import PerspectiveDashboard from "../../../../../../views/perspectives/dashboard/PerspectiveDashboard.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/")({
  component: PerspectiveDashboard,
});
