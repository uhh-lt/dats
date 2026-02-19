import { createFileRoute } from "@tanstack/react-router";
import MlAutomation from "../../../../../views/tools/MlAutomation/MlAutomation.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/tools/ml-automation")({
  component: MlAutomation,
});
