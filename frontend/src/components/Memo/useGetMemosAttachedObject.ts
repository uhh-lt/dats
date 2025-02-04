import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import CodeHooks from "../../api/CodeHooks.ts";
import SdocHooks from "../../api/SdocHooks.ts";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import TagHooks from "../../api/TagHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";

const useGetMemosAttachedObject = (type: AttachedObjectType | undefined) => {
  switch (type) {
    case AttachedObjectType.DOCUMENT_TAG:
      return TagHooks.useGetTag;
    case AttachedObjectType.CODE:
      return CodeHooks.useGetCode;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return SdocHooks.useGetDocument;
    case AttachedObjectType.SPAN_ANNOTATION:
      return SpanAnnotationHooks.useGetAnnotation;
    case AttachedObjectType.BBOX_ANNOTATION:
      return BboxAnnotationHooks.useGetAnnotation;
    default:
      return CodeHooks.useGetCode;
  }
};

export default useGetMemosAttachedObject;
