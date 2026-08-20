import { AttachedObjectType } from "@models/AttachedObjectType";
import { MenuItem, TextField } from "@mui/material";
import { memo, useCallback } from "react";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps";

export const AttachedObjectTypeValueSelector = memo(
  ({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => onChangeValue(filterExpression.id, event.target.value),
      [filterExpression.id, onChangeValue],
    );

    return (
      <TextField
        select
        variant="standard"
        fullWidth
        label="Object type"
        value={filterExpression.value}
        onChange={handleChange}
      >
        {Object.values(AttachedObjectType).map((type) => (
          <MenuItem key={type} value={type}>
            {type.replaceAll("_", " ")}
          </MenuItem>
        ))}
      </TextField>
    );
  },
);
