import { AnnotationFallbackView } from "@features/annotation";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/")({
  staticData: {
    tab: true,
    icon: Icon.ANNOTATION,
    getTitle: () => "Annotation",
  },
  component: AnnotationFallbackView,
});
