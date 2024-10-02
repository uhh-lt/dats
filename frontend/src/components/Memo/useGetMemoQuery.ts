import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import CodeHooks from "../../api/CodeHooks.ts";
import MemoHooks from "../../api/MemoHooks.ts";
import SdocHooks from "../../api/SdocHooks.ts";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import TagHooks from "../../api/TagHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";

export const useGetMemoQuery = (type: AttachedObjectType | undefined) => {
  switch (type) {
    case AttachedObjectType.DOCUMENT_TAG:
      return TagHooks.useGetMemo;
    case AttachedObjectType.CODE:
      return CodeHooks.useGetUserMemo;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return SdocHooks.useGetMemo;
    case AttachedObjectType.SPAN_ANNOTATION:
      return SpanAnnotationHooks.useGetUserMemo;
    case AttachedObjectType.BBOX_ANNOTATION:
      return BboxAnnotationHooks.useGetUserMemo;
    default:
      return MemoHooks.useGetMemo;
  }
};
