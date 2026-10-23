import { Icon } from "@components/icons";
import { searchParamFilterValidators } from "@core/filter";
import { BBoxAnnotationAnalysisView } from "@features/bbox-annotation-analysis";
import { BBoxColumns } from "@models/BBoxColumns";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { searchParamSortingModelValidator } from "@utils/searchParamValidators";

const bboxAnnotationAnalysisSearchSchema = z.object({
  ...searchParamFilterValidators<BBoxColumns>(),
  sortingModel: searchParamSortingModelValidator(),
  fetchSize: z.coerce.number().default(20),
});

export const Route = createFileRoute("/_auth/project/$projectId/analysis/bbox-annotations")({
  staticData: {
    tab: true,
    icon: Icon.BBOX_ANNOTATION_TABLE,
    getTitle: () => "BBox Annotations",
  },
  validateSearch: zodValidator(bboxAnnotationAnalysisSearchSchema),
  component: BBoxAnnotationAnalysisView,
});
