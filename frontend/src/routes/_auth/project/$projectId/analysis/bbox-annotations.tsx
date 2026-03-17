import { BBoxAnnotationAnalysisView } from "@features/bbox-annotation-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/bbox-annotations")({
  staticData: {
    tab: true,
    icon: Icon.BBOX_ANNOTATION_TABLE,
    getTitle: () => "BBox Annotations",
  },
  component: BBoxAnnotationAnalysisView,
});
