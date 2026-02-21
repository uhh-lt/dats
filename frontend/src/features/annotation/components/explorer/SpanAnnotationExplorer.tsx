import { SpanAnnotationRead } from "../../../../api/openapi/models/SpanAnnotationRead.ts";
import { SpanAnnotationHooks } from "../../../../api/SpanAnnotationHooks.ts";
import { useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { AnnotationExplorer } from "./components/AnnotationExplorer.tsx";
import { SpanAnnotationCard } from "./components/SpanAnnotationCard.tsx";

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
