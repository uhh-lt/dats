import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { SpanAnnotationRead } from "@api/models/SpanAnnotationRead";
import { useAppSelector } from "@plugins/redux";
import { AnnotationExplorer } from "./_components/AnnotationExplorer";
import { SpanAnnotationCard } from "./_components/SpanAnnotationCard";

const filterByText = (text: string) => (annotation: SpanAnnotationRead) => annotation.text.includes(text);

export function SpanAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const annotations = SpanAnnotationHooks.useGetSpanAnnotationsBatch(sdocId, visibleUserId);

  return (
    <AnnotationExplorer
      annotations={annotations.data}
      filterByText={filterByText}
      renderAnnotationCard={SpanAnnotationCard}
    />
  );
}
