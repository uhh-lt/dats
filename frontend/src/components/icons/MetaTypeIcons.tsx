import { MetaType } from "@api/models/MetaType";
import { Icon } from "./DATSIcons";

export const MetaTypeIcons: Record<MetaType, Icon> = {
  [MetaType.STRING]: Icon.META_STRING,
  [MetaType.NUMBER]: Icon.META_NUMBER,
  [MetaType.DATE]: Icon.META_DATE,
  [MetaType.BOOLEAN]: Icon.META_BOOLEAN,
  [MetaType.LIST]: Icon.META_LIST,
};
