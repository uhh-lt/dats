import { DocType } from "@api/models/DocType";
import { MenuItem, Stack, TextField } from "@mui/material";
import { DocTypeIcons, getIconComponent } from "@utils/icons/iconUtils";
import { ChangeEvent, memo, useCallback } from "react";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps";

export const DocTypeValueSelector = memo(({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
  const handleValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChangeValue(filterExpression.id, event.target.value);
    },
    [filterExpression.id, onChangeValue],
  );

  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      value={filterExpression.value}
      onChange={handleValueChange}
      slotProps={{
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem key={"none"} value={"none"}>
        <i>None</i>
      </MenuItem>
      {Object.values(DocType).map((docType) => (
        <MenuItem key={docType} value={docType}>
          <Stack direction="row" alignItems="center">
            {getIconComponent(DocTypeIcons[docType])}
            {docType}
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
});
