import { SpanAnnotationAnalysisView } from "@features/span-annotation-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/span-annotations")({
  staticData: {
    tab: true,
    icon: Icon.SPAN_ANNOTATION_TABLE,
    getTitle: () => "Span Annotations",
  },
  component: SpanAnnotationAnalysisView,
});
