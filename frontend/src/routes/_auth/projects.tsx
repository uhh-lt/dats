import { createFileRoute } from "@tanstack/react-router";
import Projects from "../../features/projects/views/ProjectsView.tsx";

export const Route = createFileRoute("/_auth/projects")({
  component: Projects,
});
