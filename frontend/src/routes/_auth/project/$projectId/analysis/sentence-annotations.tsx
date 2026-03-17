import { SentAnnotationAnalysisView } from "@features/sent-annotation-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/sentence-annotations")({
  staticData: {
    tab: true,
    icon: Icon.SENTENCE_ANNOTATION_TABLE,
    getTitle: () => "Sentence Annotations",
  },
  component: SentAnnotationAnalysisView,
});
