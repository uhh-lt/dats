import { createFileRoute } from "@tanstack/react-router";
import BBoxAnnotationAnalysis from "../../../../../features/analysis/BBoxAnnotationAnalysis/BBoxAnnotationAnalysis.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/bbox-annotations")({
  component: BBoxAnnotationAnalysis,
});
