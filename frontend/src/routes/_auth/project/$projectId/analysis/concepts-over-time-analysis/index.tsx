import { Icon } from "@components/icons";
import { CotaDashboardView, cotaQueries } from "@features/concept-over-time-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    getTitle: () => "Concepts Over Time Analysis",
  },
  context: ({ params }) => ({ cotasByProjectOptions: cotaQueries.byProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.cotasByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: CotaDashboardView,
});
