import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";

export const attachedObjectTypeToText: Record<AttachedObjectType, string> = {
  [AttachedObjectType.PROJECT]: "Project",
  [AttachedObjectType.SOURCE_DOCUMENT]: "Document",
  [AttachedObjectType.TAG]: "Tag",
  [AttachedObjectType.CODE]: "Code",
  [AttachedObjectType.SPAN_ANNOTATION]: "Text Annotation",
  [AttachedObjectType.BBOX_ANNOTATION]: "Image Annotation",
  [AttachedObjectType.SPAN_GROUP]: "Project",
  [AttachedObjectType.SENTENCE_ANNOTATION]: "Sentence Annotation",
};
