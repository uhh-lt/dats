import SdocHooks from "../../../api/SdocHooks";
import { SpanAnnotationReadResolved } from "../../../api/openapi";
import { IToken } from "./IToken";
import { useMemo } from "react";
import AdocHooks from "../../../api/AdocHooks";

function useComputeTokenData({ sdocId, annotationDocumentIds }: { sdocId: number; annotationDocumentIds: number[] }) {
  // global server state (react query)
  const tokens = SdocHooks.useGetDocumentTokens(sdocId);
  const annotations = AdocHooks.useGetSpanAnnotationsBatch(annotationDocumentIds);

  // computed
  // todo: maybe implement with selector?
  const tokenData: IToken[] | undefined = useMemo(() => {
    if (!tokens.data) return undefined;
    if (!tokens.data.token_character_offsets) return undefined;

    const offsets = tokens.data.token_character_offsets;
    const texts = tokens.data.tokens;
    console.time("tokenData");
    const result = texts.map((text, index) => ({
      beginChar: offsets[index][0],
      endChar: offsets[index][1],
      index,
      text,
      whitespace: offsets.length > index + 1 && offsets[index + 1][0] - offsets[index][1] > 0,
      newLine: text.split("\n").length - 1,
    }));
    console.timeEnd("tokenData");
    return result;
  }, [tokens.data]);

  // todo: maybe implement with selector?
  // this map stores annotationId -> SpanAnnotationReadResolved
  const annotationMap = useMemo(() => {
    if (!annotations.data) return undefined;

    console.time("annotationMap");
    const result = new Map<number, SpanAnnotationReadResolved>();
    annotations.data.forEach((a) => result.set(a.id, a));
    console.timeEnd("annotationMap");
    return result;
  }, [annotations.data]);

  // this map stores tokenId -> spanAnnotationId[]
  const annotationsPerToken = useMemo(() => {
    if (!annotations.data) return undefined;

    console.time("annotationsPerToken");
    const result = new Map<number, number[]>();
    annotations.data.forEach((annotation) => {
      for (let i = annotation.begin_token; i <= annotation.end_token - 1; i++) {
        const tokenAnnotations = result.get(i) || [];
        tokenAnnotations.push(annotation.id);
        result.set(i, tokenAnnotations);
      }
    });
    console.timeEnd("annotationsPerToken");
    return result;
  }, [annotations.data]);

  return { tokenData, annotationsPerToken, annotationMap };
}

export default useComputeTokenData;
