import { createFileRoute } from "@tanstack/react-router";
import SpanAnnotationAnalysis from "../../../../../features/span-annotation-analysis/views/main/SpanAnnotationAnalysisView";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/span-annotations")({
  component: SpanAnnotationAnalysis,
});
