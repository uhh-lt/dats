import { MenuItem, TextField } from "@mui/material";
import { ChangeEvent } from "react";
import { ColumnInfo, MyFilterExpression } from "./filterUtils.ts";

function FilterColumnSelector({
  filterExpression,
  column2Info,
  onChangeColumn,
}: {
  filterExpression: MyFilterExpression;
  column2Info: Record<string, ColumnInfo>;
  onChangeColumn(filterId: string, columnValue: string): void;
}) {
  const handleChangeColumn = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const column: string = event.target.value;
    onChangeColumn(filterExpression.id, column);
  };

  return (
    <TextField
      select
      value={filterExpression.column}
      onChange={handleChangeColumn}
      label="Column"
      variant="standard"
      fullWidth
    >
      {Object.values(column2Info).map((columnInfo) => (
        <MenuItem key={columnInfo.label} value={columnInfo.column}>
          {columnInfo.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default FilterColumnSelector;
