import { ClassifierView, classifierViewLoader } from "@features/classifier";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/classifier")({
  staticData: {
    tab: true,
    icon: Icon.CLASSIFIER,
    getTitle: () => "Classifier",
  },
  loader: ({ context, params }) =>
    classifierViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: ClassifierView,
});
