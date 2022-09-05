import React, { useMemo } from "react";
import Token from "./Token";
import "./TextAnnotatorRenderer.css";
import { SpanAnnotationReadResolved } from "../../../api/openapi";
import { IToken } from "./IToken";

interface TextAnnotationRendererProps {
  sdocId: number; // todo: is this necessary???
  tokenData: IToken[] | undefined;
  annotationsPerToken: Map<number, number[]> | undefined;
  annotationMap: Map<number, SpanAnnotationReadResolved> | undefined;
}

// needs data from useComputeTokenData
function TextAnnotationRenderer({
  sdocId,
  tokenData,
  annotationsPerToken,
  annotationMap,
}: TextAnnotationRendererProps) {
  const renderedTokens = useMemo(() => {
    if (!annotationsPerToken || !tokenData || !annotationMap) {
      return <div>Loading...</div>;
    }

    console.time("renderTokens");
    const result = (
      <>
        {tokenData.map((token) => (
          <Token
            key={`${sdocId}-${token.index}`}
            token={token}
            spanAnnotations={(annotationsPerToken.get(token.index) || []).map(
              (annotationId) => annotationMap.get(annotationId)!
            )}
          />
        ))}
      </>
    );
    console.timeEnd("renderTokens");
    return result;
  }, [sdocId, annotationsPerToken, tokenData, annotationMap]);

  return <>{renderedTokens}</>;
}

export default TextAnnotationRenderer;
