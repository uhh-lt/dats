import { Icon } from "@components/icons";
import { jobQueries } from "@core/job";
import { MlAutomationView } from "@features/ml-automation";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/tools/ml-automation")({
  staticData: {
    tab: true,
    icon: Icon.ML_AUTOMATION,
    getTitle: () => "ML Automation",
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ mlJobsOptions: jobQueries.ml.byProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.mlJobsOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: MlAutomationView,
});
