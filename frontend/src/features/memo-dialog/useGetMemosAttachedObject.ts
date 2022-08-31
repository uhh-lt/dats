import { AttachedObjectType } from "../../api/openapi";
import TagHooks from "../../api/TagHooks";
import CodeHooks from "../../api/CodeHooks";
import SdocHooks from "../../api/SdocHooks";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks";

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
