import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotationExplorer from "./AnnotationExplorer.tsx";
import SpanAnnotationCard from "./SpanAnnotationCard.tsx";

const filterByText = (text: string) => (annotation: SpanAnnotationReadResolved) => annotation.text.includes(text);

function SpanAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const annotations = SpanAnnotationHooks.useGetSpanAnnotationsBatch(
    sdocId,
    visibleUserId ? [visibleUserId] : undefined,
  );

  return (
    <AnnotationExplorer
      annotations={annotations.data}
      filterByText={filterByText}
      renderAnnotationCard={SpanAnnotationCard}
    />
  );
}

export default SpanAnnotationExplorer;
