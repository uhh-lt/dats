import { createFileRoute } from "@tanstack/react-router";
import Annotation from "../../../../../features/annotation/views/main/AnnotationView";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/")({
  component: Annotation,
});
