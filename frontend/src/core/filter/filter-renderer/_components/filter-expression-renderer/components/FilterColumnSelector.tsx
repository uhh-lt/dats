import { MenuItem, TextField } from "@mui/material";
import { ChangeEvent, memo, useCallback } from "react";
import { ColumnInfo, MyFilterExpression } from "../../../../filterUtils";

interface FilterColumnSelectorProps {
  filterExpression: MyFilterExpression;
  columnInfoMap: Record<string, ColumnInfo>;
  onChangeColumn(id: string, columnValue: string): void;
}

export const FilterColumnSelector = memo(
  ({ filterExpression, columnInfoMap, onChangeColumn }: FilterColumnSelectorProps) => {
    const handleChangeColumn = useCallback(
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const column: string = event.target.value;
        onChangeColumn(filterExpression.id, column);
      },
      [filterExpression.id, onChangeColumn],
    );

    return (
      <TextField
        select
        value={filterExpression.column}
        onChange={handleChangeColumn}
        label="Column"
        variant="standard"
        fullWidth
      >
        {Object.values(columnInfoMap).map((columnInfo) => (
          <MenuItem key={columnInfo.label} value={columnInfo.column}>
            {columnInfo.label}
          </MenuItem>
        ))}
      </TextField>
    );
  },
);
