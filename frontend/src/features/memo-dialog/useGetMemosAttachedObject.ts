import { AttachedObjectType } from "../../api/openapi";
import TagHooks from "../../api/TagHooks";
import CodeHooks from "../../api/CodeHooks";
import SdocHooks from "../../api/SdocHooks";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";

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
    default:
      return CodeHooks.useGetCode;
  }
};

export default useGetMemosAttachedObject;
