import { useAppSelector } from "@plugins/redux";
import { SpanAnnotationRead } from "../../../../api/openapi/models/SpanAnnotationRead";
import { SpanAnnotationHooks } from "../../../../api/SpanAnnotationHooks";
import { AnnotationExplorer } from "./components/AnnotationExplorer";
import { SpanAnnotationCard } from "./components/SpanAnnotationCard";

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
