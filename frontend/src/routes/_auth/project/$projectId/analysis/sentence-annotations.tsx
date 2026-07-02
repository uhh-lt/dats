import { SentAnnoColumns } from "@api/models/SentAnnoColumns";
import { Icon } from "@components/icons";
import { deserializeFilterFromSearchParam, FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, MyFilter } from "@core/filter";
import { SentAnnotationAnalysisView } from "@features/sent-annotation-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const sentenceAnnotationAnalysisSearchSchema = z.object({
  [FILTER_PARAM]: z
    .custom<string | MyFilter<SentAnnoColumns>>()
    .default("")
    .transform((value) => deserializeFilterFromSearchParam<SentAnnoColumns>(value, "root")),
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

export const Route = createFileRoute("/_auth/project/$projectId/analysis/sentence-annotations")({
  staticData: {
    tab: true,
    icon: Icon.SENTENCE_ANNOTATION_TABLE,
    getTitle: () => "Sentence Annotations",
  },
  validateSearch: zodValidator(sentenceAnnotationAnalysisSearchSchema),
  component: SentAnnotationAnalysisView,
});
