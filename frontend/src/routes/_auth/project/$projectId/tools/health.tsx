import { createFileRoute } from "@tanstack/react-router";
import Health from "../../../../../features/health/Health.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/tools/health")({
  component: Health,
});
