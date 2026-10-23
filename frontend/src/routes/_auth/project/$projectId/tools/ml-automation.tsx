import { Icon } from "@components/icons";
import { mlAutomationQueries, MlAutomationView } from "@features/ml-automation";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/tools/ml-automation")({
  staticData: {
    tab: true,
    icon: Icon.ML_AUTOMATION,
    getTitle: () => "ML Automation",
  },
  context: ({ params }) => ({ mlJobsByProjectOptions: mlAutomationQueries.job.byProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.mlJobsByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: MlAutomationView,
});
