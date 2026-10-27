import { sdocQueries } from "@core/source-document";
import { sentenceAnnotationQueries } from "@core/sentence-annotation";
import { spanAnnotationQueries } from "@core/span-annotation";
import { AgreementAnnotationType } from "@models/AgreementAnnotationType";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SentenceAnnotatorResult } from "@models/SentenceAnnotatorResult";
import { useQuery } from "@tanstack/react-query";

const uniqueSentenceAnnotations = (result: SentenceAnnotatorResult): SentenceAnnotationRead[] => {
  const byId = new Map<number, SentenceAnnotationRead>();
  Object.values(result.sentence_annotations).forEach((annotations) =>
    annotations.forEach((annotation) => byId.set(annotation.id, annotation)),
  );
  return Array.from(byId.values());
};

/**
 * The document data and the annotations of one annotator (span or sentence annotations) that a
 * snippet renders. The queries are shared with the annotator views, so every document is loaded once.
 */
export function useSnippetData(sdocId: number, annotationType: AgreementAnnotationType, userId: number) {
  const isSpan = annotationType === AgreementAnnotationType.SPAN;
  const sdocData = useQuery(sdocQueries.data(sdocId));
  const spanAnnotations = useQuery(spanAnnotationQueries.bySdoc(isSpan ? sdocId : undefined, userId));
  const sentenceAnnotations = useQuery({
    ...sentenceAnnotationQueries.bySdoc(isSpan ? undefined : sdocId, userId),
    select: uniqueSentenceAnnotations,
  });
  const annotations = isSpan ? spanAnnotations : sentenceAnnotations;
  return {
    sdocData: sdocData.data,
    spanAnnotations: spanAnnotations.data,
    sentenceAnnotations: sentenceAnnotations.data,
    isLoading: sdocData.isLoading || annotations.isLoading,
    error: sdocData.error ?? annotations.error,
  };
}
