import { Icon } from "../../../utils/icons/iconUtils";

export interface TabData {
  id: string;
  path: string;
  base: string; // The type of tab (e.g., 'annotation', 'whiteboard', 'search')
  data_id?: string; // Optional ID if the tab represents a specific entity
  icon?: Icon;
}
