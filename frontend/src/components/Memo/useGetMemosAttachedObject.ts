import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import CodeHooks from "../../api/CodeHooks.ts";
import SdocHooks from "../../api/SdocHooks.ts";
import SentenceAnnotationHooks from "../../api/SentenceAnnotationHooks.ts";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import TagHooks from "../../api/TagHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";

const useGetMemosAttachedObject = (type: AttachedObjectType | undefined) => {
  switch (type) {
    case AttachedObjectType.TAG:
      return TagHooks.useGetTag;
    case AttachedObjectType.CODE:
      return CodeHooks.useGetCode;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return SdocHooks.useGetDocument;
    case AttachedObjectType.SPAN_ANNOTATION:
      return SpanAnnotationHooks.useGetAnnotation;
    case AttachedObjectType.BBOX_ANNOTATION:
      return BboxAnnotationHooks.useGetAnnotation;
    case AttachedObjectType.SENTENCE_ANNOTATION:
      return SentenceAnnotationHooks.useGetAnnotation;
    default:
      console.warn("Unknown attached object type:", type);
      return CodeHooks.useGetCode;
  }
};

export default useGetMemosAttachedObject;
