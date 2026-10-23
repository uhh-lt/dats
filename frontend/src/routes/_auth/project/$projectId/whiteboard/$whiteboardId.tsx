import { Icon } from "@components/icons";
import { parseIdParam } from "@core/navigation";
import { whiteboardQueries, WhiteboardView } from "@features/whiteboard";
import { CircularProgress } from "@mui/material";
import { createFileRoute, notFound } from "@tanstack/react-router";

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
    parse: ({ whiteboardId }) => ({ whiteboardId: parseIdParam(whiteboardId) }),
  },
  context: ({ params }) => ({
    whiteboardsByProjectOptions: whiteboardQueries.byProject(params.projectId),
    whiteboardDataOptions: whiteboardQueries.data(params.projectId, params.whiteboardId),
  }),
  loader: async ({ context, params }) => {
    const whiteboards = await context.queryClient.ensureQueryData(context.whiteboardsByProjectOptions);
    if (!whiteboards[params.whiteboardId]) throw notFound();
    await context.queryClient.ensureQueryData(context.whiteboardDataOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: WhiteboardView,
});
