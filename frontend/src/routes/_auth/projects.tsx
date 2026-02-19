import { createFileRoute } from "@tanstack/react-router";
import Projects from "../../views/projects/Projects.tsx";

export const Route = createFileRoute("/_auth/projects")({
  component: Projects,
});
