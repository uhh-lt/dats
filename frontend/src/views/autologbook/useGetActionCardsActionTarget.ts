import { ActionTargetObjectType } from "../../api/openapi";
import TagHooks from "../../api/TagHooks";
import CodeHooks from "../../api/CodeHooks";
import SdocHooks from "../../api/SdocHooks";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks";
import MemoHooks from "../../api/MemoHooks";
import ProjectHooks from "../../api/ProjectHooks";

const useGetActionCardsActionTarget = (type: ActionTargetObjectType | undefined) => {
  switch (type) {
    case ActionTargetObjectType.MEMO:
      return MemoHooks.useGetMemo;
    case ActionTargetObjectType.ANNOTATION_DOCUMENT:
      return CodeHooks.useGetCode;
    case ActionTargetObjectType.SOURCE_DOCUMENT:
      return SdocHooks.useGetDocument;
    case ActionTargetObjectType.CODE:
      return CodeHooks.useGetCode;
    case ActionTargetObjectType.SPAN_ANNOTATION:
      return SpanAnnotationHooks.useGetAnnotation;
    case ActionTargetObjectType.SPAN_GROUP:
      return CodeHooks.useGetCode;
    case ActionTargetObjectType.BBOX_ANNOTATION:
      return BboxAnnotationHooks.useGetAnnotation;
    case ActionTargetObjectType.PROJECT:
      return ProjectHooks.useGetProject;
    case ActionTargetObjectType.DOCUMENT_TAG:
      return TagHooks.useGetTag;
    default:
      return CodeHooks.useGetCode;
  }
};

export default useGetActionCardsActionTarget;
