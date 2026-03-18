import { PerspectiveDashboardView, perspectiveDashboardViewLoader } from "@features/perspectives";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/")({
  staticData: {
    tab: true,
    icon: Icon.MAP,
    getTitle: (aspect: Awaited<ReturnType<typeof perspectiveDashboardViewLoader>> | undefined) =>
      String(aspect?.name ?? "Aspect"),
  },
  loader: ({ context, params }) =>
    perspectiveDashboardViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      aspectId: params.aspectId,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load perspective dashboard: {(error as Error).message}</div>,
  component: PerspectiveDashboardView,
});
