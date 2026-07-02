import { Icon } from "@components/icons";
import { WhiteboardDashboardView, whiteboardDashboardViewLoader } from "@features/whiteboard";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/whiteboard/")({
  staticData: {
    tab: true,
    icon: Icon.WHITEBOARD,
    getTitle: () => "Whiteboard",
  },
  loader: ({ context, params }) =>
    whiteboardDashboardViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: WhiteboardDashboardView,
});
