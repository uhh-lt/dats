import { createFileRoute } from "@tanstack/react-router";
import BBoxAnnotationAnalysis from "../../../../../features/bbox-annotation-analysis/views/main/BBoxAnnotationAnalysisView";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/bbox-annotations")({
  component: BBoxAnnotationAnalysis,
});
