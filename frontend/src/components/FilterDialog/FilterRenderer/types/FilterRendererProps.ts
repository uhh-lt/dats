import { FilterActions } from "../../filterSlice.ts";
import { ColumnInfo, MyFilter } from "../../filterUtils.ts";

export interface FilterRendererProps {
  editableFilter: MyFilter;
  filterActions: FilterActions;
  column2Info: Record<string, ColumnInfo>;
}
