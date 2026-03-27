import { PerspectivesListView, perspectivesListViewLoader } from "@features/perspectives";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/")({
  staticData: {
    tab: true,
    icon: Icon.PERSPECTIVES,
    getTitle: () => "Perspectives",
  },
  loader: ({ context, params }) =>
    perspectivesListViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: PerspectivesListView,
});
