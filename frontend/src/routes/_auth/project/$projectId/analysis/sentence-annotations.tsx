import { SentAnnotationAnalysisView } from "@features/sent-annotation-analysis";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/sentence-annotations")({
  component: SentAnnotationAnalysisView,
});
