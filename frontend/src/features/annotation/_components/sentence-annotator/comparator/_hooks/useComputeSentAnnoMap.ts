import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { useMemo } from "react";

export type SentAnnoMap = Record<number, SentenceAnnotationRead>;

export function useComputeSentAnnoMap(
  sentenceAnnotations: Record<number, SentenceAnnotationRead[]> | undefined,
  sentenceId: number,
): SentAnnoMap {
  return useMemo(() => {
    if (!sentenceAnnotations) return {};
    const annotations = sentenceAnnotations[sentenceId];
    if (!annotations) return {};
    return annotations.reduce((acc, anno) => {
      acc[anno.id] = anno;
      return acc;
    }, {} as SentAnnoMap);
  }, [sentenceAnnotations, sentenceId]);
}
