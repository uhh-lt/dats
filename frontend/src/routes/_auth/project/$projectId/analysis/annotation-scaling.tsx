import { AnnotationScalingView } from "@features/annotation-scaling";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/annotation-scaling")({
  component: AnnotationScalingView,
});
