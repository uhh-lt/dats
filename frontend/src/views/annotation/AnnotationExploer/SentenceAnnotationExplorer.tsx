import { range } from "lodash";
import { useMemo } from "react";
import { SentenceAnnotationReadResolved } from "../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotationExplorer from "./AnnotationExplorer.tsx";
import SentenceAnnotationCard from "./SentenceAnnotationCard.tsx";

const filterByText = (text: string) => (annotation: SentenceAnnotationReadResolved) =>
  range(annotation.sentence_id_start + 1, annotation.sentence_id_end + 2)
    .join(" ")
    .includes(text);

function SentenceAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const annotator = SdocHooks.useGetSentenceAnnotator(sdocId, visibleUserId);
  const annotations = useMemo(() => {
    if (!annotator.data) return [];
    const result: SentenceAnnotationReadResolved[] = [];
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

export default SentenceAnnotationExplorer;
