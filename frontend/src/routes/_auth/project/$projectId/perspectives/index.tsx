import { Icon } from "@components/icons";
import { perspectivesQueries, PerspectivesDashboardView } from "@features/perspectives";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/")({
  staticData: {
    tab: true,
    icon: Icon.PERSPECTIVES,
    getTitle: () => "Perspectives",
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ aspectsByProjectOptions: perspectivesQueries.aspectsByProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.aspectsByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: PerspectivesDashboardView,
});
