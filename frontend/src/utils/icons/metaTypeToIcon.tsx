import { MetaType } from "../../api/openapi/models/MetaType.ts";
import { getIconComponent, Icon } from "./iconUtils.tsx";

export const metaTypeToIcon: Record<MetaType, React.ReactElement> = {
  [MetaType.STRING]: getIconComponent(Icon.META_STRING),
  [MetaType.NUMBER]: getIconComponent(Icon.META_NUMBER),
  [MetaType.DATE]: getIconComponent(Icon.META_DATE),
  [MetaType.BOOLEAN]: getIconComponent(Icon.META_BOOLEAN),
  [MetaType.LIST]: getIconComponent(Icon.META_LIST),
};
