import { MlAutomationView, mlAutomationViewLoader } from "@features/ml-automation";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/tools/ml-automation")({
  staticData: {
    tab: true,
    icon: Icon.ML_AUTOMATION,
    getTitle: () => "ML Automation",
  },
  loader: ({ context, params }) =>
    mlAutomationViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load ML automations: {(error as Error).message}</div>,
  component: MlAutomationView,
});
