import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { SpanAnnotationRead } from "@api/models/SpanAnnotationRead";
import { AnnotationRouteAPI } from "../../_hooks/annotationRouteAPI";
import { AnnotationExplorer } from "./_components/AnnotationExplorer";
import { SpanAnnotationCard } from "./_components/SpanAnnotationCard";

const filterByText = (text: string) => (annotation: SpanAnnotationRead) => annotation.text.includes(text);

export function SpanAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const { visibleUserId } = AnnotationRouteAPI.useSearch();
  const annotations = SpanAnnotationHooks.useGetSpanAnnotationsBatch(sdocId, visibleUserId);

  return (
    <AnnotationExplorer
      annotations={annotations.data}
      filterByText={filterByText}
      renderAnnotationCard={SpanAnnotationCard}
    />
  );
}
