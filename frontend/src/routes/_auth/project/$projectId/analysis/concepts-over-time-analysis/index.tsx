import { ensureRouteFeatureEnabled } from "@core/feature";
import { Icon } from "@components/icons";
import { CotaDashboardView, cotaQueries } from "@features/concept-over-time-analysis";
import { CircularProgress } from "@mui/material";
import { Feature } from "@models/Feature";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    feature: Feature.CONCEPTS_OVER_TIME,
  },
  context: ({ params }) => ({ cotasByProjectOptions: cotaQueries.byProject(params.projectId) }),
  loader: async ({ context, params, route }) => {
    if (!(await ensureRouteFeatureEnabled({ context, params, route }))) return;
    await context.queryClient.ensureQueryData(context.cotasByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: CotaDashboardView,
});
