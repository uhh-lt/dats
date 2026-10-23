import { Icon } from "@components/icons";
import { searchParamFilterValidators } from "@core/filter";
import { SpanAnnotationAnalysisView } from "@features/span-annotation-analysis";
import { SpanColumns } from "@models/SpanColumns";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { searchParamSortingModelValidator } from "@utils/searchParamValidators";

const spanAnnotationAnalysisSearchSchema = z.object({
  ...searchParamFilterValidators<SpanColumns>(),
  sortingModel: searchParamSortingModelValidator(),
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
