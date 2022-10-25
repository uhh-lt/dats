import React from "react";
import { AnnotationDocumentRead, SourceDocumentRead } from "../../../api/openapi";
import TextAnnotatorRenderer from "../../annotation/TextAnnotator/TextAnnotatorRenderer";
import useComputeTokenData from "../../annotation/TextAnnotator/useComputeTokenData";

interface AnnotationVisualizerProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead;
  showEntities: boolean;
}

/**
 * Super simple annotation rendering, does not work for overlapping annotations!!!
 */
function TextViewer({ sdoc, adoc, showEntities }: AnnotationVisualizerProps) {
  // computed / custom hooks
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenData({
    sdocId: sdoc.id,
    annotationDocumentIds: showEntities ? [adoc.id] : [],
  });

  return (
    <TextAnnotatorRenderer
      sdocId={sdoc.id}
      tokenData={tokenData}
      annotationsPerToken={annotationsPerToken}
      annotationMap={annotationMap}
      sentenceSearch
    />
  );
}

export default TextViewer;
