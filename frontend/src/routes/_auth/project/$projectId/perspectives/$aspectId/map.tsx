import { Icon } from "@components/icons";
import { perspectivesQueries, PerspectivesMapView } from "@features/perspectives";
import { CircularProgress } from "@mui/material";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/map")({
  staticData: {
    tab: true,
    icon: Icon.MAP,
    getTitle: ({ queryClient, params }) => {
      const aspects = queryClient.getQueryData(perspectivesQueries.aspectsByProject(Number(params.projectId)).queryKey);
      return `Map ${aspects?.[Number(params.aspectId)]?.name ?? ""}`;
    },
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ aspectsByProjectOptions: perspectivesQueries.aspectsByProject(params.projectId) }),
  loader: async ({ context, params }) => {
    const aspects = await context.queryClient.ensureQueryData(context.aspectsByProjectOptions);
    if (!aspects[params.aspectId]) throw notFound();
  },
  pendingComponent: () => <CircularProgress />,
  component: PerspectivesMapView,
});
