import { SearchViewLayout } from "@models/SearchViewLayout";
import { Icon } from "./DATSIcons";

export const SearchViewLayoutIcons: Record<SearchViewLayout, Icon> = {
  [SearchViewLayout.TABLE]: Icon.LAYOUT_TABLE,
  [SearchViewLayout.LIST]: Icon.LAYOUT_LIST,
  [SearchViewLayout.BOARD]: Icon.LAYOUT_BOARD,
  [SearchViewLayout.GALLERY]: Icon.LAYOUT_GALLERY,
  [SearchViewLayout.FEED]: Icon.LAYOUT_FEED,
};
