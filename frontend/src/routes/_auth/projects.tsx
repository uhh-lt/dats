import { projectQueries } from "@core/project";
import { ProjectsView } from "@features/projects-overview";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/projects")({
  context: () => ({ userProjectsOptions: projectQueries.userProjects() }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.userProjectsOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: ProjectsView,
});
