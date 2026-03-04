import { MlAutomationView } from "@features/ml-automation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/tools/ml-automation")({
  component: MlAutomationView,
});
