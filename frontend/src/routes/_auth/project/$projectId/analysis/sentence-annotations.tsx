import { createFileRoute } from "@tanstack/react-router";
import SentAnnotationAnalysis from "../../../../../features/sent-annotation-analysis/views/main/SentAnnotationAnalysisView";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/sentence-annotations")({
  component: SentAnnotationAnalysis,
});
