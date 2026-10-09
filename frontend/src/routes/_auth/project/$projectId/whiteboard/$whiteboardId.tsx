import { Icon } from "@components/icons";
import { whiteboardQueries, WhiteboardView } from "@features/whiteboard";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/whiteboard/$whiteboardId")({
  staticData: {
    tab: true,
    icon: Icon.WHITEBOARD,
    getTitle: ({ queryClient, params }) => {
      const whiteboards = queryClient.getQueryData(whiteboardQueries.byProject(Number(params.projectId)).queryKey);
      return `Whiteboard ${whiteboards?.[Number(params.whiteboardId)]?.title ?? ""}`;
    },
  },
  params: {
    parse: ({ whiteboardId }) => ({ whiteboardId: parseInt(whiteboardId) }),
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({
    whiteboardOptions: whiteboardQueries.byProject(params.projectId),
    whiteboardDataOptions: whiteboardQueries.data(params.projectId, params.whiteboardId),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.whiteboardOptions),
      context.queryClient.ensureQueryData(context.whiteboardDataOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: WhiteboardView,
});
