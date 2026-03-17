import { Icon } from "@utils/icons/iconUtils";

export interface TabData {
  id: string;
  href: string;
  label: string;
  icon?: Icon;
}

export interface ProjectTabState {
  tabsById: Record<string, TabData>;
  tabOrder: string[];
}
