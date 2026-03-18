import { LogicalOperator } from "@api/models/LogicalOperator";
import { ColumnInfo, FilterOperators, MyFilter } from "../filterUtils";

export interface FilterRendererHandlers {
  onAddFilter: (filterId: string) => void;
  onAddFilterExpression: (filterId: string) => void;
  onDeleteFilter: (filterId: string) => void;
  onChangeFilterLogicalOperator: (filterId: string, operator: LogicalOperator) => void;
  onChangeFilterColumn: (filterId: string, columnValue: string) => void;
  onChangeFilterOperator: (filterId: string, operator: FilterOperators) => void;
  onChangeFilterValue: (filterId: string, value: string | number | boolean | string[]) => void;
}

export interface FilterRendererProps extends FilterRendererHandlers {
  editableFilter: MyFilter;
  column2Info: Record<string, ColumnInfo>;
}
