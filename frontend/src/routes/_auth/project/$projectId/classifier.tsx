import { Icon } from "@components/icons";
import { classifierQueries, ClassifierView } from "@features/classifier";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/classifier")({
  staticData: {
    tab: true,
    icon: Icon.CLASSIFIER,
    getTitle: () => "Classifier",
  },
  context: ({ params }) => ({
    classifiersByProjectOptions: classifierQueries.byProject(params.projectId),
    classifierJobsByProjectOptions: classifierQueries.job.byProject(params.projectId),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.classifiersByProjectOptions),
      context.queryClient.ensureQueryData(context.classifierJobsByProjectOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: ClassifierView,
});
