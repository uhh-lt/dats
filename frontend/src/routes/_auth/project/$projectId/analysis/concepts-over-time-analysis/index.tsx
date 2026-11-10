import { ensureFeatureEnabled } from "@core/feature";
import { Icon } from "@components/icons";
import { CotaDashboardView, cotaQueries } from "@features/concept-over-time-analysis";
import { CircularProgress } from "@mui/material";
import { Feature } from "@models/Feature";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    getTitle: () => "Concepts Over Time Analysis",
    feature: Feature.CONCEPTS_OVER_TIME,
  },
  context: ({ params }) => ({ cotasByProjectOptions: cotaQueries.byProject(params.projectId) }),
  loader: async ({ context, params }) => {
    if (!(await ensureFeatureEnabled(context.queryClient, params.projectId, Feature.CONCEPTS_OVER_TIME))) return;
    await context.queryClient.ensureQueryData(context.cotasByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: CotaDashboardView,
});
