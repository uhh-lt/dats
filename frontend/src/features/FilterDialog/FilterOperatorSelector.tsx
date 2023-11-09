import { MenuItem, TextField } from "@mui/material";
import {
  FilterOperator,
  FilterOperatorType,
  MyFilterExpression,
  getFilterExpressionColumnValue,
  operator2HumanReadable,
} from "./filterUtils";

function FilterOperatorSelector({
  filterExpression,
  onChangeOperator,
  columnValue2operator,
}: {
  filterExpression: MyFilterExpression;
  onChangeOperator(id: string, operator: FilterOperator): void;
  columnValue2operator: Record<string, FilterOperatorType>;
}) {
  const operator = columnValue2operator[getFilterExpressionColumnValue(filterExpression)];

  if (operator === undefined || operator === null) {
    return null;
  }
  return (
    <TextField
      select
      value={filterExpression.operator}
      onChange={(event) => onChangeOperator(filterExpression.id, event.target.value as FilterOperator)}
      label="Operator"
      variant="standard"
      fullWidth
    >
      {Object.keys(operator).map((op) => (
        <MenuItem key={op} value={op}>
          {operator2HumanReadable[op as FilterOperator]}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default FilterOperatorSelector;
