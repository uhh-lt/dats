import { createFileRoute } from "@tanstack/react-router";
import SpanAnnotationAnalysis from "../../../../../views/analysis/SpanAnnotationAnalysis/SpanAnnotationAnalysis.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/span-annotations")({
  component: SpanAnnotationAnalysis,
});
