import { MlAutomationView } from "@features/ml-automation";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/tools/ml-automation")({
  staticData: {
    tab: true,
    icon: Icon.ML_AUTOMATION,
    getTitle: () => "ML Automation",
  },
  component: MlAutomationView,
});
