import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SentenceAnnotatorResult } from "@models/SentenceAnnotatorResult";
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
  const { visibleUserId, compareWithUserId } = AnnotationRouteAPI.useSearch();
  const annotatorLeft = SentenceAnnotationHooks.useGetSentenceAnnotator(sdocId, visibleUserId);
  const annotatorRight = SentenceAnnotationHooks.useGetSentenceAnnotator(sdocId, compareWithUserId);

  const annotations = useMemo(() => {
    const result: SentenceAnnotationRead[] = [];
    const seenIds = new Set<number>();

    const addAnnotations = (data: SentenceAnnotatorResult | undefined) => {
      if (!data) return;
      Object.entries(data.sentence_annotations).forEach(([sentenceId, annos]) => {
        const sentId = parseInt(sentenceId);
        annos.forEach((annotation) => {
          if (annotation.sentence_id_start === sentId && !seenIds.has(annotation.id)) {
            seenIds.add(annotation.id);
            result.push(annotation);
          }
        });
      });
    };

    addAnnotations(annotatorLeft.data);
    addAnnotations(annotatorRight.data);

    return result.sort((a, b) => a.sentence_id_start - b.sentence_id_start);
  }, [annotatorLeft.data, annotatorRight.data]);

  return (
    <AnnotationExplorer
      annotations={annotations}
      filterByText={filterByText}
      renderAnnotationCard={SentenceAnnotationCard}
    />
  );
}
