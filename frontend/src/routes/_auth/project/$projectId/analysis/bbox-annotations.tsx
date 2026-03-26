import { BBoxColumns } from "@api/models/BBoxColumns";
import { deserializeFilterFromSearchParam, FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, MyFilter } from "@core/filter";
import { BBoxAnnotationAnalysisView } from "@features/bbox-annotation-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Icon } from "@utils/icons/iconUtils";
import { z } from "zod";

const bboxAnnotationAnalysisSearchSchema = z.object({
  [FILTER_PARAM]: z
    .custom<string | MyFilter<BBoxColumns>>()
    .default("")
    .transform((value) => deserializeFilterFromSearchParam<BBoxColumns>(value, "root")),
  [FILTER_EXPERT_MODE_PARAM]: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .default(false),
  sortingModel: z
    .array(
      z.object({
        id: z.string(),
        desc: z.boolean(),
      }),
    )
    .default([]),
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
