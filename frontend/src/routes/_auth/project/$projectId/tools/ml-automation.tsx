import { createFileRoute } from "@tanstack/react-router";
import MlAutomation from "../../../../../features/ml-automation/views/main/MLAutomationView";

export const Route = createFileRoute("/_auth/project/$projectId/tools/ml-automation")({
  component: MlAutomation,
});
