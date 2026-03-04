import { SentenceAnnotationRead } from "@api/models/SentenceAnnotationRead";
import { SentenceAnnotatorResult } from "@api/models/SentenceAnnotatorResult";
import { useMemo } from "react";

export type SentAnnoMap = Record<number, SentenceAnnotationRead>;

export function useComputeSentAnnoMap(
  annotatorResult: SentenceAnnotatorResult | undefined,
  sentenceId: number,
): SentAnnoMap {
  return useMemo(() => {
    if (!annotatorResult) return { sentAnnoId2sentAnnoMap: {} };
    return annotatorResult.sentence_annotations[sentenceId].reduce((acc, anno) => {
      acc[anno.id] = anno;
      return acc;
    }, {} as SentAnnoMap);
  }, [annotatorResult, sentenceId]);
}
