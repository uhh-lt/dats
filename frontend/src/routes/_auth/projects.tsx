import { createFileRoute } from "@tanstack/react-router";
import Projects from "../../features/projects-overview/views/main/ProjectsView";

export const Route = createFileRoute("/_auth/projects")({
  component: Projects,
});
