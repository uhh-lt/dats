import { useMemo } from "react";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationReadResolved } from "../../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import { SentenceAnnotatorResult } from "../../../../api/openapi/models/SentenceAnnotatorResult.ts";

export interface AnnotatorMaps {
  codeId2CodeMap: Record<number, CodeRead>;
  sentAnnoId2sentAnnoMap: Record<number, SentenceAnnotationReadResolved>;
}

export function useComputeAnnotatorMaps(
  annotatorResult: SentenceAnnotatorResult | undefined,
  sentenceId: number,
): AnnotatorMaps {
  return useMemo(() => {
    if (!annotatorResult) return { codeId2CodeMap: {}, sentAnnoId2sentAnnoMap: {} };

    const codeId2CodeMap = annotatorResult.sentence_annotations[sentenceId].reduce(
      (acc, anno) => {
        acc[anno.code.id] = anno.code;
        return acc;
      },
      {} as Record<number, CodeRead>,
    );
    const sentAnnoId2sentAnnoMap = annotatorResult.sentence_annotations[sentenceId].reduce(
      (acc, anno) => {
        acc[anno.id] = anno;
        return acc;
      },
      {} as Record<number, SentenceAnnotationReadResolved>,
    );
    return { codeId2CodeMap, sentAnnoId2sentAnnoMap };
  }, [annotatorResult, sentenceId]);
}
