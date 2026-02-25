import { createFileRoute } from "@tanstack/react-router";
import AnnotationScaling from "../../../../../features/annotation-scaling/views/main/AnnotationScalingView";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/annotation-scaling")({
  component: AnnotationScaling,
});
