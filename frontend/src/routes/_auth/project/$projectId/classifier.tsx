import { Icon } from "@components/icons";
import { jobQueries } from "@core/job";
import { classifierQueries, ClassifierView } from "@features/classifier";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/classifier")({
  staticData: {
    tab: true,
    icon: Icon.CLASSIFIER,
    getTitle: () => "Classifier",
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({
    classifiersOptions: classifierQueries.byProject(params.projectId),
    classifierJobsOptions: jobQueries.classifier.byProject(params.projectId),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.classifiersOptions),
      context.queryClient.ensureQueryData(context.classifierJobsOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: ClassifierView,
});
