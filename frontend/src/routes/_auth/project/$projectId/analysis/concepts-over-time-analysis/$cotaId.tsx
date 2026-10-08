import { cotaQueries } from "@api/queries/cotaQueries";
import { Icon } from "@components/icons";
import { CotaView } from "@features/concept-over-time-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/$cotaId")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    getTitle: ({ queryClient, params }) => {
      const cotas = queryClient.getQueryData(cotaQueries.byProject(Number(params.projectId)).queryKey);
      return `COTA ${cotas?.[Number(params.cotaId)]?.name ?? ""}`;
    },
  },
  params: {
    parse: ({ cotaId }) => ({ cotaId: parseInt(cotaId) }),
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ cotaOptions: cotaQueries.byProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.cotaOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: CotaView,
});
