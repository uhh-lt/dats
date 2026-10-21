import { AttachedObjectTypeIcons, getIconComponent } from "@components/icons";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { MenuItem, Stack, TextField } from "@mui/material";
import { memo, useCallback } from "react";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps";

export const AttachedObjectTypeValueSelector = memo(
  ({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
    const handleValueChange = useCallback(
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
        onChange={handleValueChange}
      >
        {Object.values(AttachedObjectType).map((type) => (
          <MenuItem key={type} value={type}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {getIconComponent(AttachedObjectTypeIcons[type])}
              <span>{type.replaceAll("_", " ")}</span>
            </Stack>
          </MenuItem>
        ))}
      </TextField>
    );
  },
);
