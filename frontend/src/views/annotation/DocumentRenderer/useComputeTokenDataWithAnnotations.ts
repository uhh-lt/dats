import { useMemo } from "react";
import { SourceDocumentWithDataRead } from "../../../api/openapi/models/SourceDocumentWithDataRead.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { IToken } from "./IToken.ts";

function useComputeTokenDataWithAnnotations({
  sdoc,
  annotations,
}: {
  sdoc: SourceDocumentWithDataRead;
  annotations: SpanAnnotationReadResolved[];
}) {
  // computed
  // todo: maybe implement with selector?
  const tokenData: IToken[] | undefined = useMemo(() => {
    const offsets = sdoc.token_character_offsets;
    const texts = sdoc.tokens;
    const result = texts.map((text, index) => ({
      beginChar: offsets[index][0],
      endChar: offsets[index][1],
      index,
      text,
      whitespace: offsets.length > index + 1 && offsets[index + 1][0] - offsets[index][1] > 0,
      newLine: text.split("\n").length - 1,
    }));
    return result;
  }, [sdoc]);

  // todo: maybe implement with selector?
  // this map stores annotationId -> SpanAnnotationReadResolved
  const annotationMap = useMemo(() => {
    const result = new Map<number, SpanAnnotationReadResolved>();
    annotations.forEach((a) => result.set(a.id, a));
    return result;
  }, [annotations]);

  // this map stores tokenId -> spanAnnotationId[]
  const annotationsPerToken = useMemo(() => {
    const result = new Map<number, number[]>();
    annotations.forEach((annotation) => {
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

export default useComputeTokenDataWithAnnotations;
