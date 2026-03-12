import { FilterActions } from "../filterSlice";
import { ColumnInfo, MyFilter } from "../filterUtils";

export interface FilterRendererProps {
  editableFilter: MyFilter;
  filterActions: FilterActions;
  column2Info: Record<string, ColumnInfo>;
}
