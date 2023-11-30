import SdocHooks from "../../api/SdocHooks";
import { SpanAnnotationReadResolved } from "../../api/openapi";
import { useMemo } from "react";
import AdocHooks from "../../api/AdocHooks";
import { IToken } from "./IToken";

function useComputeTokenData({ sdocId, annotationDocumentIds }: { sdocId: number; annotationDocumentIds: number[] }) {
  // global server state (react query)
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const annotations = AdocHooks.useGetAllSpanAnnotationsBatch(annotationDocumentIds);

  // computed
  // todo: maybe implement with selector?
  const tokenData: IToken[] | undefined = useMemo(() => {
    if (!sdoc.data) return undefined;
    if (!sdoc.data.token_character_offsets) return undefined;

    const offsets = sdoc.data.token_character_offsets;
    const texts = sdoc.data.tokens;
    const result = texts.map((text, index) => ({
      beginChar: offsets[index][0],
      endChar: offsets[index][1],
      index,
      text,
      whitespace: offsets.length > index + 1 && offsets[index + 1][0] - offsets[index][1] > 0,
      newLine: text.split("\n").length - 1,
    }));
    return result;
  }, [sdoc.data]);

  // todo: maybe implement with selector?
  // this map stores annotationId -> SpanAnnotationReadResolved
  const annotationMap = useMemo(() => {
    const annotationsIsUndefined = annotations.some((a) => !a.data);
    if (annotationsIsUndefined) return undefined;

    const annotationsList = annotations.map((a) => a.data!).flat();
    const result = new Map<number, SpanAnnotationReadResolved>();
    annotationsList.forEach((a) => result.set(a.id, a));
    return result;
  }, [annotations]);

  // this map stores tokenId -> spanAnnotationId[]
  const annotationsPerToken = useMemo(() => {
    const annotationsIsUndefined = annotations.some((a) => !a.data);
    if (annotationsIsUndefined) return undefined;

    const annotationsList = annotations.map((a) => a.data!).flat();
    const result = new Map<number, number[]>();
    annotationsList.forEach((annotation) => {
      for (let i = annotation.begin_token; i <= annotation.end_token - 1; i++) {
        const tokenAnnotations = result.get(i) || [];
        tokenAnnotations.push(annotation.id);
        result.set(i, tokenAnnotations);
      }
    });
    return result;
  }, [annotations]);

  return { tokenData, annotationsPerToken, annotationMap };
}

export default useComputeTokenData;
