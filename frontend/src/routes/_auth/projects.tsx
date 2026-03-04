import { ProjectsView } from "@features/projects-overview";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/projects")({
  component: ProjectsView,
});
