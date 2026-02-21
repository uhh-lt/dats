import { createFileRoute } from "@tanstack/react-router";
import SpanAnnotationAnalysis from "../../../../../features/analysis/SpanAnnotationAnalysis/SpanAnnotationAnalysis.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/span-annotations")({
  component: SpanAnnotationAnalysis,
});
