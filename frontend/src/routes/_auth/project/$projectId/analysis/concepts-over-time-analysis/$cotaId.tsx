import { CotaView, cotaViewLoader } from "@features/concept-over-time-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/$cotaId")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    getTitle: (cota: Awaited<ReturnType<typeof cotaViewLoader>> | undefined) => `COTA ${String(cota?.name ?? "")}`,
  },
  params: {
    parse: ({ cotaId }) => ({ cotaId: parseInt(cotaId) }),
  },
  loader: ({ context, params }) =>
    cotaViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      cotaId: params.cotaId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: CotaView,
});
