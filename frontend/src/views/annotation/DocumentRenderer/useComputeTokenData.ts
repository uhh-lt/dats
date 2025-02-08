import { useMemo } from "react";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { IToken } from "./IToken.ts";

function useComputeTokenData({ sdocData, userIds }: { sdocData: SourceDocumentDataRead; userIds: number[] }) {
  // global server state (react query)
  const annotations = SpanAnnotationHooks.useGetSpanAnnotationsBatch(sdocData.id, userIds);

  // computed
  // todo: maybe implement with selector?
  const tokenData: IToken[] | undefined = useMemo(() => {
    if (!sdocData) return undefined;
    if (!sdocData.token_character_offsets) return undefined;

    const offsets = sdocData.token_character_offsets;
    const texts = sdocData.tokens;
    const result = texts.map((text, index) => ({
      beginChar: offsets[index][0],
      endChar: offsets[index][1],
      index,
      text,
      whitespace: offsets.length > index + 1 && offsets[index + 1][0] - offsets[index][1] > 0,
      newLine: text.split("\n").length - 1,
    }));
    return result;
  }, [sdocData]);

  // annotationMap stores annotationId -> SpanAnnotationReadResolved
  // annotationsPerToken map stores tokenId -> spanAnnotationId[]
  const { annotationMap, annotationsPerToken } = useMemo(() => {
    if (!annotations.data) return { annotationMap: undefined, annotationsPerToken: undefined };

    const annotationMap = new Map<number, SpanAnnotationReadResolved>();
    const annotationsPerToken = new Map<number, number[]>();
    annotations.data.forEach((annotation) => {
      for (let i = annotation.begin_token; i <= annotation.end_token - 1; i++) {
        const tokenAnnotations = annotationsPerToken.get(i) || [];
        tokenAnnotations.push(annotation.id);
        annotationsPerToken.set(i, tokenAnnotations);
      }
      annotationMap.set(annotation.id, annotation);
    });
    return { annotationMap, annotationsPerToken };
  }, [annotations.data]);

  return { tokenData, annotationsPerToken, annotationMap };
}

export default useComputeTokenData;
