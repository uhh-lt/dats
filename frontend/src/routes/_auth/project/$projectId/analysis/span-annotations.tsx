import { SpanAnnotationAnalysisView } from "@features/span-annotation-analysis";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/span-annotations")({
  component: SpanAnnotationAnalysisView,
});
