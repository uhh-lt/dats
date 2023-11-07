import { TextField, MenuItem } from "@mui/material";
import { ArrayOperator, IDOperator, NumberOperator, StringOperator } from "../../api/openapi";
import { MyFilterExpression, getFilterExpressionColumn } from "./filterUtils";

function FilterOperatorSelector({
  filterExpression,
  onChangeOperator,
  column2operator,
}: {
  filterExpression: MyFilterExpression;
  onChangeOperator(id: string, operator: IDOperator | NumberOperator | StringOperator | ArrayOperator): void;
  column2operator: Record<
    string,
    typeof IDOperator | typeof NumberOperator | typeof StringOperator | typeof ArrayOperator
  >;
}) {
  const operator = column2operator[getFilterExpressionColumn(filterExpression)];

  if (operator === undefined || operator === null) {
    return null;
  }
  return (
    <TextField
      select
      value={filterExpression.operator}
      onChange={(event) =>
        onChangeOperator(
          filterExpression.id,
          event.target.value as IDOperator | NumberOperator | StringOperator | ArrayOperator,
        )
      }
      label="Operator"
      variant="standard"
      fullWidth
    >
      {Object.keys(operator).map((op) => (
        <MenuItem key={op} value={op}>
          {op}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default FilterOperatorSelector;
