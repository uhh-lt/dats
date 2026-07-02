import { Icon } from "@components/icons";
import { CotaDashboardView, cotaDashboardViewLoader } from "@features/concept-over-time-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/concepts-over-time-analysis/")({
  staticData: {
    tab: true,
    icon: Icon.COTA,
    getTitle: () => "Concepts Over Time Analysis",
  },
  loader: ({ context, params }) =>
    cotaDashboardViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
    }),
  pendingComponent: () => <CircularProgress />,
  component: CotaDashboardView,
});
