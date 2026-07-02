import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { range } from "lodash";
import { useMemo } from "react";
import { AnnotationRouteAPI } from "../../_hooks/annotationRouteAPI";
import { AnnotationExplorer } from "./_components/AnnotationExplorer";
import { SentenceAnnotationCard } from "./_components/SentenceAnnotationCard";

const filterByText = (text: string) => (annotation: SentenceAnnotationRead) =>
  range(annotation.sentence_id_start + 1, annotation.sentence_id_end + 2)
    .join(" ")
    .includes(text);

export function SentenceAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const { visibleUserId } = AnnotationRouteAPI.useSearch();
  const annotator = SentenceAnnotationHooks.useGetSentenceAnnotator(sdocId, visibleUserId);
  const annotations = useMemo(() => {
    if (!annotator.data) return [];
    const result: SentenceAnnotationRead[] = [];
    Object.entries(annotator.data.sentence_annotations).forEach(([sentenceId, annotations]) => {
      const sentId = parseInt(sentenceId);
      annotations.forEach((annotation) => {
        if (annotation.sentence_id_start === sentId) {
          result.push(annotation);
        }
      });
    });
    return result;
  }, [annotator.data]);

  return (
    <AnnotationExplorer
      annotations={annotations}
      filterByText={filterByText}
      renderAnnotationCard={SentenceAnnotationCard}
    />
  );
}
