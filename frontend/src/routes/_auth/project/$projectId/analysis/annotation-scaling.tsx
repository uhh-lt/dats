import { AnnotationScalingView } from "@features/annotation-scaling";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/annotation-scaling")({
  staticData: {
    tab: true,
    icon: Icon.ANNOTATION_SCALING,
    getTitle: () => "Annotation Scaling",
  },
  component: AnnotationScalingView,
});
