import { Icon } from "@components/icons";
import { searchParamFilterValidators } from "@core/filter";
import { SentAnnotationAnalysisView } from "@features/sent-annotation-analysis";
import { SentAnnoColumns } from "@models/SentAnnoColumns";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { searchParamSortingModelValidator } from "@utils/searchParamValidators";

const sentenceAnnotationAnalysisSearchSchema = z.object({
  ...searchParamFilterValidators<SentAnnoColumns>(),
  sortingModel: searchParamSortingModelValidator(),
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
