import { WhiteboardView, whiteboardViewLoader } from "@features/whiteboard";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/whiteboard/$whiteboardId")({
  staticData: {
    tab: true,
    icon: Icon.WHITEBOARD,
    getTitle: (whiteboard: Awaited<ReturnType<typeof whiteboardViewLoader>> | undefined) =>
      `Whiteboard ${String(whiteboard?.title ?? "")}`,
  },
  params: {
    parse: ({ whiteboardId }) => ({ whiteboardId: parseInt(whiteboardId) }),
  },
  loader: ({ context, params }) =>
    whiteboardViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      whiteboardId: params.whiteboardId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: WhiteboardView,
});
