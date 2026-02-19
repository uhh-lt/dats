import { createFileRoute } from "@tanstack/react-router";
import SentAnnotationAnalysis from "../../../../../views/analysis/SentAnnotationAnalysis/SentAnnotationAnalysis.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/sentence-annotations")({
  component: SentAnnotationAnalysis,
});
