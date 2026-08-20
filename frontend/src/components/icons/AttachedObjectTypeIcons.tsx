import { AttachedObjectType } from "@models/AttachedObjectType";
import { Icon } from "./DATSIcons";

export const AttachedObjectTypeIcons: Record<AttachedObjectType, Icon> = {
  [AttachedObjectType.SOURCE_DOCUMENT]: Icon.DOCUMENT,
  [AttachedObjectType.CODE]: Icon.CODE,
  [AttachedObjectType.SENTENCE_ANNOTATION]: Icon.SENTENCE_ANNOTATION,
  [AttachedObjectType.SPAN_ANNOTATION]: Icon.SPAN_ANNOTATION,
  [AttachedObjectType.SPAN_GROUP]: Icon.SPAN_GROUP,
  [AttachedObjectType.BBOX_ANNOTATION]: Icon.BBOX_ANNOTATION,
  [AttachedObjectType.PROJECT]: Icon.PROJECT,
  [AttachedObjectType.TAG]: Icon.TAG,
};
