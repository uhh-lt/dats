import { SourceDocumentWithDataRead } from "../../../api/openapi/models/SourceDocumentWithDataRead.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import DocumentRenderer from "../DocumentRenderer/DocumentRenderer.tsx";
import useComputeTokenDataWithAnnotations from "../DocumentRenderer/useComputeTokenDataWithAnnotations.ts";

interface TextAnnotatorValidatorProps {
  sdoc: SourceDocumentWithDataRead;
  annotations: SpanAnnotationReadResolved[];
}

function TextAnnotatorValidator({ sdoc, annotations }: TextAnnotatorValidatorProps) {
  // computed / custom hooks
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenDataWithAnnotations({
    sdoc: sdoc,
    annotations: annotations,
  });

  return (
    <>
      <DocumentRenderer
        className="myFlexFillAllContainer"
        onMouseUp={() => console.log("HI")}
        html={sdoc.html}
        tokenData={tokenData}
        annotationsPerToken={annotationsPerToken}
        annotationMap={annotationMap}
        isViewer={false}
        projectId={sdoc.project_id}
        style={{ zIndex: 1, overflowY: "auto" }}
      />
    </>
  );
}

export default TextAnnotatorValidator;
