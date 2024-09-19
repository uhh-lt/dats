import { AnnotationResult } from "../../../../api/openapi/models/AnnotationResult.ts";
import SdocHooks from "../../../../api/SdocHooks.ts";
import TextAnnotatorValidator from "../../../../views/annotation/TextAnnotatorValidator/TextAnnotatorValidator.tsx";

function AnnotationResultStepDocument({ annotationResult }: { annotationResult: AnnotationResult }) {
  const sdoc = SdocHooks.useGetDocument(annotationResult.sdoc_id);

  if (sdoc.isSuccess) {
    return <TextAnnotatorValidator sdoc={sdoc.data} annotations={annotationResult.suggested_annotations} />;
  }
  return null;
}

export default AnnotationResultStepDocument;
