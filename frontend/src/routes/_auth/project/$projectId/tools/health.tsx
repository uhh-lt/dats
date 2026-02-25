import { HealthView } from "@features/health";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/tools/health")({
  component: HealthView,
});
