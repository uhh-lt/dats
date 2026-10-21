import { Icon } from "@components/icons";
import { cotaQueries, CotaView } from "@features/concept-over-time-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute, notFound } from "@tanstack/react-router";

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
  context: ({ params }) => ({ cotasByProjectOptions: cotaQueries.byProject(params.projectId) }),
  loader: async ({ context, params }) => {
    const cotas = await context.queryClient.ensureQueryData(context.cotasByProjectOptions);
    if (!cotas[params.cotaId]) throw notFound();
  },
  pendingComponent: () => <CircularProgress />,
  component: CotaView,
});
