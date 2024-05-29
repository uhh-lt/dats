import { useMemo } from "react";
import AdocHooks from "../../../api/AdocHooks.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotationExplorer from "./AnnotationExplorer.tsx";
import SpanAnnotationCard from "./SpanAnnotationCard.tsx";

const filterByText = (text: string) => (annotation: SpanAnnotationReadResolved) => annotation.span_text.includes(text);

function SpanAnnotationExplorer() {
  // data
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const annotationsBatch = AdocHooks.useGetAllSpanAnnotationsBatch(visibleAdocIds);
  const annotations = useMemo(() => {
    const annotationsIsUndefined = annotationsBatch.some((a) => !a.data);
    if (annotationsIsUndefined) return undefined;
    return annotationsBatch.map((a) => a.data!).flat();
  }, [annotationsBatch]);

  return (
    <AnnotationExplorer
      annotations={annotations}
      filterByText={filterByText}
      renderAnnotationCard={SpanAnnotationCard}
    />
  );
}

export default SpanAnnotationExplorer;
