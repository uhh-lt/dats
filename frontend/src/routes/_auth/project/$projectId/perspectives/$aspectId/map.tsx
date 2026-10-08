import { perspectiveQueries } from "@api/queries/perspectiveQueries";
import { Icon } from "@components/icons";
import { PerspectivesMapView } from "@features/perspectives";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId/map")({
  staticData: {
    tab: true,
    icon: Icon.MAP,
    getTitle: ({ queryClient, params }) => {
      const aspects = queryClient.getQueryData(perspectiveQueries.aspectsByProject(Number(params.projectId)).queryKey);
      return `Map ${aspects?.[Number(params.aspectId)]?.name ?? ""}`;
    },
  },
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params }) => ({ aspectsOptions: perspectiveQueries.aspectsByProject(params.projectId) }),
  loader: async ({ context, params }) => {
    const aspects = await context.queryClient.ensureQueryData(context.aspectsOptions);
    if (!aspects[params.aspectId]) {
      throw new Error(`Aspect ${params.aspectId} not found in project ${params.projectId}`);
    }
  },
  pendingComponent: () => <CircularProgress />,
  component: PerspectivesMapView,
});
