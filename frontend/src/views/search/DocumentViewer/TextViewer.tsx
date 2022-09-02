import React, { useMemo } from "react";
import { AnnotationDocumentRead, SourceDocumentRead, SpanAnnotationReadResolved } from "../../../api/openapi";
import AdocHooks from "../../../api/AdocHooks";

interface AnnotationVisualizerProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead | null;
  showEntities: boolean;
}

/**
 * Super simple annotation rendering, does not work for overlapping annotations!!!
 */
function TextViewer({ sdoc, adoc, showEntities }: AnnotationVisualizerProps) {
  // queries
  const annotations = AdocHooks.useGetAllSpanAnnotations(adoc?.id);

  const content = useMemo(() => {
    const annos = annotations.data || [];
    const sortedAnnotations: SpanAnnotationReadResolved[] = annos
      .filter((a) => a.code?.id !== 21) // filter out sentences (id 21)
      .sort((a, b) => a.begin - b.begin);

    let result: JSX.Element[] = [];
    let lastEnd = 0;
    sortedAnnotations.forEach((spanAnnotation) => {
      result.push(
        <React.Fragment key={`pre-${spanAnnotation.id}`}>
          {sdoc.content.substring(lastEnd, spanAnnotation.begin)}
        </React.Fragment>
      );
      if (spanAnnotation.code) {
        result.push(
          <span
            key={spanAnnotation.id}
            style={{
              backgroundColor: spanAnnotation.code.color,
            }}
          >
            [{spanAnnotation.code.name}] {/*[{spanAnnotation.code.name} {spanAnnotation.code.id}]{" "}*/}
            {sdoc.content.substring(spanAnnotation.begin, spanAnnotation.end)}
          </span>
        );
      } else {
        result.push(
          <React.Fragment key={`post-${spanAnnotation.id}`}>
            {sdoc.content.substring(spanAnnotation.begin, spanAnnotation.end)}
          </React.Fragment>
        );
      }
      lastEnd = spanAnnotation.end;
    });
    if (lastEnd < sdoc.content.length) {
      result.push(
        <React.Fragment key={`post-post`}>{sdoc.content.substring(lastEnd, sdoc.content.length)}</React.Fragment>
      );
    }
    return result;
  }, [annotations.data, sdoc.content]);

  return (
    <div>
      {(annotations.isLoading || !showEntities) && <>{sdoc.content}</>}
      {annotations.isError && <>{annotations.error.message}</>}
      {annotations.isSuccess && showEntities && <>{content}</>}
    </div>
  );
}

export default TextViewer;
