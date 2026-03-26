import { Icon } from "@utils/icons/iconUtils";

export type TabRouteSearch = Record<string, unknown>;

export interface TabRouteState {
  to: string;
  search?: TabRouteSearch;
  hash?: string;
  params?: Record<string, unknown>;
}

export interface TabData {
  id: string;
  route: TabRouteState;
  label: string;
  icon?: Icon;
}

export interface ProjectTabState {
  tabsById: Record<string, TabData>;
  tabOrder: string[];
}
