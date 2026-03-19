import { ProjectsView, projectsViewLoader } from "@features/projects-overview";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/projects")({
  loader: ({ context }) =>
    projectsViewLoader({
      queryClient: context.queryClient,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load projects: {(error as Error).message}</div>,
  component: ProjectsView,
});
