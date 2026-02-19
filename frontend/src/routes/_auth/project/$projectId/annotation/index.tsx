import { createFileRoute } from "@tanstack/react-router";
import Annotation from "../../../../../views/annotation/Annotation.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/")({
  component: Annotation,
});
