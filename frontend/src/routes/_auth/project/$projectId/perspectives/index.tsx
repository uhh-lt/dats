import { Icon } from "@components/icons";
import { perspectiveQueries, PerspectivesListView } from "@features/perspectives";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/")({
  staticData: {
    tab: true,
    icon: Icon.PERSPECTIVES,
    getTitle: () => "Perspectives",
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ aspectsOptions: perspectiveQueries.aspectsByProject(params.projectId) }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.aspectsOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: PerspectivesListView,
});
