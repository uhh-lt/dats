import { Icon } from "@components/icons";
import { AnnotationFallbackView } from "@features/annotation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/annotation/")({
  staticData: {
    tab: true,
    icon: Icon.ANNOTATION,
    getTitle: () => "Annotation",
  },
  component: AnnotationFallbackView,
});
