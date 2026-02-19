import { createFileRoute } from "@tanstack/react-router";
import AnnotationScaling from "../../../../../views/analysis/AnnotationScaling/AnnotationScaling.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/annotation-scaling")({
  component: AnnotationScaling,
});
