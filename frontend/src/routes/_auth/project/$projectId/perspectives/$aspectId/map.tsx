import { Icon } from "@components/icons";
import { PerspectivesMapView, perspectivesMapViewLoader } from "@features/perspectives";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/map")({
  staticData: {
    tab: true,
    icon: Icon.MAP,
    getTitle: (aspect: Awaited<ReturnType<typeof perspectivesMapViewLoader>> | undefined) =>
      `Map ${String(aspect?.name ?? "")}`,
  },
  loader: ({ context, params }) =>
    perspectivesMapViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      aspectId: params.aspectId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: PerspectivesMapView,
});
