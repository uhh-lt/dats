import { cotaQueries } from "@api/queries/cotaQueries";
import { Icon } from "@components/icons";
import { CotaDashboardView } from "@features/concept-over-time-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    getTitle: () => "Concepts Over Time Analysis",
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ cotaOptions: cotaQueries.byProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.cotaOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: CotaDashboardView,
});
