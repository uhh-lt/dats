import { ensureRouteFeatureEnabled } from "@core/feature";
import { Icon } from "@components/icons";
import { parseIdParam } from "@core/navigation";
import { cotaQueries, CotaView } from "@features/concept-over-time-analysis";
import { CircularProgress } from "@mui/material";
import { Feature } from "@models/Feature";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/$cotaId")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    getTitle: ({ queryClient, params }) => {
      const cotas = queryClient.getQueryData(cotaQueries.byProject(Number(params.projectId)).queryKey);
      return `COTA ${cotas?.[Number(params.cotaId)]?.name ?? ""}`;
    },
    feature: Feature.CONCEPTS_OVER_TIME,
  },
  params: {
    parse: ({ cotaId }) => ({ cotaId: parseIdParam(cotaId) }),
  },
  context: ({ params }) => ({ cotasByProjectOptions: cotaQueries.byProject(params.projectId) }),
  loader: async ({ context, params, route }) => {
    if (!(await ensureRouteFeatureEnabled({ context, params, route }))) return;
    const cotas = await context.queryClient.ensureQueryData(context.cotasByProjectOptions);
    if (!cotas[params.cotaId]) throw notFound();
  },
  pendingComponent: () => <CircularProgress />,
  component: CotaView,
});
