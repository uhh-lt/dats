import BboxAnnotationHooks from "../../api/BboxAnnotationHooks";
import CodeHooks from "../../api/CodeHooks";
import MemoHooks from "../../api/MemoHooks";
import SdocHooks from "../../api/SdocHooks";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";
import TagHooks from "../../api/TagHooks";
import { AttachedObjectType } from "../../api/openapi";

export const useGetMemoQuery = (type: AttachedObjectType | undefined) => {
  switch (type) {
    case AttachedObjectType.DOCUMENT_TAG:
      return TagHooks.useGetMemo;
    case AttachedObjectType.CODE:
      return CodeHooks.useGetMemo;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return SdocHooks.useGetMemo;
    case AttachedObjectType.SPAN_ANNOTATION:
      return SpanAnnotationHooks.useGetMemo;
    case AttachedObjectType.BBOX_ANNOTATION:
      return BboxAnnotationHooks.useGetMemo;
    default:
      return MemoHooks.useGetMemo;
  }
};
