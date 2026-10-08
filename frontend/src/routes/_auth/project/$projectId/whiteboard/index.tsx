import { whiteboardQueries } from "@api/queries/whiteboardQueries";
import { Icon } from "@components/icons";
import { WhiteboardDashboardView } from "@features/whiteboard";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/whiteboard/")({
  staticData: {
    tab: true,
    icon: Icon.WHITEBOARD,
    getTitle: () => "Whiteboard",
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ whiteboardOptions: whiteboardQueries.byProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.whiteboardOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: WhiteboardDashboardView,
});
