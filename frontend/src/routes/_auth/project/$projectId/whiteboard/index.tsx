import { Icon } from "@components/icons";
import { WhiteboardDashboardView, whiteboardQueries } from "@features/whiteboard";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/whiteboard/")({
  staticData: {
    tab: true,
    icon: Icon.WHITEBOARD,
    getTitle: () => "Whiteboard",
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ whiteboardsByProjectOptions: whiteboardQueries.byProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.whiteboardsByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: WhiteboardDashboardView,
});
