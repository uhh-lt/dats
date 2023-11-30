import { MenuItem, TextField } from "@mui/material";
import {
  ColumnInfo,
  FilterOperators,
  MyFilterExpression,
  filterOperator2FilterOperatorType,
  operator2HumanReadable,
} from "./filterUtils";

function FilterOperatorSelector({
  filterExpression,
  onChangeOperator,
  column2Info,
}: {
  filterExpression: MyFilterExpression;
  onChangeOperator(id: string, operator: FilterOperators): void;
  column2Info: Record<string, ColumnInfo>;
}) {
  const filterOperator = column2Info[filterExpression.column].operator;
  const filterOperatorType = filterOperator2FilterOperatorType[filterOperator];

  return (
    <TextField
      select
      value={filterExpression.operator}
      onChange={(event) => onChangeOperator(filterExpression.id, event.target.value as FilterOperators)}
      label="Operator"
      variant="standard"
      fullWidth
    >
      {Object.values(filterOperatorType).map((op) => (
        <MenuItem key={op} value={op}>
          {operator2HumanReadable[op as FilterOperators]}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default FilterOperatorSelector;
