import { BBoxAnnotationAnalysisView } from "@features/bbox-annotation-analysis";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/bbox-annotations")({
  component: BBoxAnnotationAnalysisView,
});
