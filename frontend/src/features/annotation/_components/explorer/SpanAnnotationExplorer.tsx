import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { useMemo } from "react";
import { AnnotationRouteAPI } from "../../_hooks/annotationRouteAPI";
import { AnnotationExplorer } from "./_components/AnnotationExplorer";
import { SpanAnnotationCard } from "./_components/SpanAnnotationCard";

const filterByText = (text: string) => (annotation: SpanAnnotationRead) => annotation.text.includes(text);

export function SpanAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const { visibleUserId, compareWithUserId } = AnnotationRouteAPI.useSearch();
  const annotationsLeft = SpanAnnotationHooks.useGetSpanAnnotationsBatch(sdocId, visibleUserId);
  const annotationsRight = SpanAnnotationHooks.useGetSpanAnnotationsBatch(sdocId, compareWithUserId);

  const combinedAnnotations = useMemo(() => {
    const leftData = annotationsLeft.data || [];
    const rightData = annotationsRight.data || [];

    const combined = [...leftData];
    const leftIds = new Set(leftData.map((anno) => anno.id));
    rightData.forEach((anno) => {
      if (!leftIds.has(anno.id)) {
        combined.push(anno);
      }
    });

    return combined.sort((a, b) => a.begin_token - b.begin_token);
  }, [annotationsLeft.data, annotationsRight.data]);

  return (
    <AnnotationExplorer
      annotations={combinedAnnotations}
      filterByText={filterByText}
      renderAnnotationCard={SpanAnnotationCard}
    />
  );
}
