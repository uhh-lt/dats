import { Icon } from "@components/icons";
import { ExperimentDashboardView, experimentQueries } from "@features/experiment-studio";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/experiments/")({
  staticData: {
    tab: true,
    icon: Icon.EXPERIMENT,
    getTitle: () => "Experiment Studio",
  },
  context: ({ params }) => ({ experimentsByProjectOptions: experimentQueries.byProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.experimentsByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: ExperimentDashboardView,
});
