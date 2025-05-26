import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { Icon, getIconComponent } from "./iconUtils.tsx";

export const attachedObjectTypeToIcon: Record<AttachedObjectType, React.ReactElement> = {
  [AttachedObjectType.PROJECT]: getIconComponent(Icon.PROJECT),
  [AttachedObjectType.SOURCE_DOCUMENT]: getIconComponent(Icon.DOCUMENT),
  [AttachedObjectType.DOCUMENT_TAG]: getIconComponent(Icon.TAG),
  [AttachedObjectType.CODE]: getIconComponent(Icon.CODE),
  [AttachedObjectType.SPAN_ANNOTATION]: getIconComponent(Icon.SPAN_ANNOTATION),
  [AttachedObjectType.BBOX_ANNOTATION]: getIconComponent(Icon.BBOX_ANNOTATION),
  [AttachedObjectType.SPAN_GROUP]: <></>,
  [AttachedObjectType.SENTENCE_ANNOTATION]: getIconComponent(Icon.SENTENCE_ANNOTATION),
};
