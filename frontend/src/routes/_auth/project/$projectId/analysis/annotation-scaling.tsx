import { Icon } from "@components/icons";
import { AnnotationScalingView } from "@features/annotation-scaling";
import { Feature } from "@models/Feature";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/annotation-scaling")({
  staticData: {
    tab: true,
    icon: Icon.ANNOTATION_SCALING,
    feature: Feature.ANNOTATION_SCALING,
  },
  component: AnnotationScalingView,
});
