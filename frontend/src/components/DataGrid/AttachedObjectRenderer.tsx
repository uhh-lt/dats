import { AttachedObjectType } from "../../api/openapi";
import BBoxAnnotationRenderer from "./BBoxAnnotationRenderer";
import CodeRenderer from "./CodeRenderer";
import SdocRenderer from "./SdocRenderer";
import SpanAnnotationRenderer from "./SpanAnnotationRenderer";
import TagRenderer from "./TagRenderer";

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
      return <SdocRenderer sdoc={attachedObjectId} link={false} />;
    default:
      return <>{attachedObjectType}</>;
  }
}

export default AttachedObjectRenderer;
