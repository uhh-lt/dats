import { MenuItem, TextField } from "@mui/material";
import { ChangeEvent } from "react";
import { MyFilterExpression, getFilterExpressionColumnValue } from "./filterUtils";
import { DocType } from "../../api/openapi";

function FilterColumnSelector({
  filterExpression,
  columns,
  onChangeColumn,
}: {
  filterExpression: MyFilterExpression;
  columns: { label: string; value: string }[];
  onChangeColumn(id: string, column: string, metadataKey?: string, docType?: DocType): void;
}) {
  const handleChangeColumn = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const column: string = event.target.value;
    if (column.startsWith("META-")) {
      const [doctype, key] = column.split("-").slice(1);
      onChangeColumn(filterExpression.id, column, key, doctype as DocType);
    } else {
      onChangeColumn(filterExpression.id, column, undefined, undefined);
    }
  };

  return (
    <TextField
      select
      value={getFilterExpressionColumnValue(filterExpression)}
      onChange={handleChangeColumn}
      label="Column"
      variant="standard"
      fullWidth
    >
      {columns.map((column) => (
        <MenuItem key={column.label} value={column.value}>
          {column.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default FilterColumnSelector;
