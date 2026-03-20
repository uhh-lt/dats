import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM } from "@core/filter";
import { SpanAnnotationAnalysisView } from "@features/span-annotation-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Icon } from "@utils/icons/iconUtils";
import { z } from "zod";

const spanAnnotationAnalysisSearchSchema = z.object({
  [FILTER_PARAM]: z.string().default(""),
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

export const Route = createFileRoute("/_auth/project/$projectId/analysis/span-annotations")({
  staticData: {
    tab: true,
    icon: Icon.SPAN_ANNOTATION_TABLE,
    getTitle: () => "Span Annotations",
  },
  validateSearch: zodValidator(spanAnnotationAnalysisSearchSchema),
  component: SpanAnnotationAnalysisView,
});
