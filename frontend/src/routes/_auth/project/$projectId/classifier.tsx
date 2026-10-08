import { Icon } from "@components/icons";
import { ClassifierView, classifierViewOptions } from "@features/classifier";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/classifier")({
  staticData: {
    tab: true,
    icon: Icon.CLASSIFIER,
    getTitle: () => "Classifier",
  },
  // the options are built once here and used by the loader and the view
  beforeLoad: ({ params }) => classifierViewOptions(params.projectId),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.classifiersOptions),
      context.queryClient.ensureQueryData(context.classifierJobsOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: ClassifierView,
});
