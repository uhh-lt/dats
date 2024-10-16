import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";

export const MemoColors: Record<AttachedObjectType, string> = {
  [AttachedObjectType.CODE]: "orange",
  [AttachedObjectType.DOCUMENT_TAG]: "brown",
  [AttachedObjectType.PROJECT]: "blue",
  [AttachedObjectType.SPAN_ANNOTATION]: "red",
  [AttachedObjectType.SOURCE_DOCUMENT]: "green",
  [AttachedObjectType.SPAN_GROUP]: "pink",
  [AttachedObjectType.BBOX_ANNOTATION]: "magenta",
};

export const MemoShortnames: Record<AttachedObjectType, string> = {
  [AttachedObjectType.CODE]: "C",
  [AttachedObjectType.DOCUMENT_TAG]: "T",
  [AttachedObjectType.PROJECT]: "P",
  [AttachedObjectType.SPAN_ANNOTATION]: "A",
  [AttachedObjectType.SOURCE_DOCUMENT]: "D",
  [AttachedObjectType.SPAN_GROUP]: "SG",
  [AttachedObjectType.BBOX_ANNOTATION]: "B",
};

export const MemoNames: Record<AttachedObjectType, string> = {
  [AttachedObjectType.CODE]: "Code",
  [AttachedObjectType.DOCUMENT_TAG]: "Tag",
  [AttachedObjectType.PROJECT]: "Project",
  [AttachedObjectType.SPAN_ANNOTATION]: "Annotation",
  [AttachedObjectType.SOURCE_DOCUMENT]: "Document",
  [AttachedObjectType.SPAN_GROUP]: "SpanGroup",
  [AttachedObjectType.BBOX_ANNOTATION]: "BoundingBox",
};
