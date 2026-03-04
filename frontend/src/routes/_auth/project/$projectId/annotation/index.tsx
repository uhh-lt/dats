import { AnnotationView } from "@features/annotation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/")({
  component: AnnotationView,
});
