import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import BBoxAnnotationRenderer from "./BBoxAnnotationRenderer.tsx";
import CodeRenderer from "./CodeRenderer.tsx";
import SdocRenderer from "./SdocRenderer.tsx";
import SpanAnnotationRenderer from "./SpanAnnotationRenderer.tsx";
import TagRenderer from "./TagRenderer.tsx";

interface AttachedObjectRendererProps {
  attachedObjectId: number;
  attachedObjectType: AttachedObjectType;
}

function AttachedObjectRenderer({ attachedObjectId, attachedObjectType }: AttachedObjectRendererProps) {
  switch (attachedObjectType) {
    case AttachedObjectType.BBOX_ANNOTATION:
      return <BBoxAnnotationRenderer bboxAnnotation={attachedObjectId} />;
    case AttachedObjectType.SPAN_ANNOTATION:
      return <SpanAnnotationRenderer spanAnnotation={attachedObjectId} />;
    case AttachedObjectType.DOCUMENT_TAG:
      return <TagRenderer tag={attachedObjectId} />;
    case AttachedObjectType.CODE:
      return <CodeRenderer code={attachedObjectId} />;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return <SdocRenderer sdoc={attachedObjectId} renderFilename renderDoctypeIcon />;
    default:
      return <>{attachedObjectType}</>;
  }
}

export default AttachedObjectRenderer;
