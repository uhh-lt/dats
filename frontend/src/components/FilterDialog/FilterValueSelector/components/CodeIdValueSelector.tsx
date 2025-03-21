import { MenuItem, TextField } from "@mui/material";
import { ChangeEvent, memo, useCallback } from "react";
import CodeHooks from "../../../../api/CodeHooks.ts";
import CodeRenderer from "../../../Code/CodeRenderer.tsx";
import { useCodesWithLevel } from "../../../Code/useCodesWithLevel.ts";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps.ts";

const CodeIdValueSelector = memo(({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
  // global server state (react-query)
  const projectCodes = CodeHooks.useGetEnabledCodes();
  const codeTree = useCodesWithLevel(projectCodes.data || []);

  const handleValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChangeValue(filterExpression.id, parseInt(event.target.value));
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
      defaultValue={
        typeof filterExpression.value === "string" ? parseInt(filterExpression.value) || -1 : filterExpression.value
      }
      onChange={handleValueChange}
      slotProps={{
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem key={-1} value={-1}>
        <i>None</i>
      </MenuItem>
      {codeTree.map((codeWithLevel) => (
        <MenuItem
          key={codeWithLevel.data.id}
          value={codeWithLevel.data.id}
          style={{ paddingLeft: codeWithLevel.level * 10 + 6 }}
        >
          <CodeRenderer code={codeWithLevel.data} />
        </MenuItem>
      ))}
    </TextField>
  );
});

export default CodeIdValueSelector;
