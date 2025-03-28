import { MenuItem, TextField } from "@mui/material";
import { ChangeEvent, memo, useCallback, useState } from "react";
import CodeHooks from "../../../../api/CodeHooks.ts";
import CodeRenderer from "../../../Code/CodeRenderer.tsx";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps.ts";

const SpanAnnotationValueSelector = memo(({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
  // global server state (react-query)
  const projectCodes = CodeHooks.useGetAllCodesList();
  const [value, setValue] = useState<string[]>(() => {
    // check if value is string[][] or string[], then make sure that value is string[]
    if (Array.isArray(filterExpression.value) && filterExpression.value.every((entry) => !Array.isArray(entry))) {
      return filterExpression.value as string[];
    }
    return ["-1", ""];
  });

  const handleCodeValueChange = useCallback(
    (codeId: string) => {
      const newValue = [codeId, value[1]];
      setValue(newValue);
      onChangeValue(filterExpression.id, newValue);
    },
    [filterExpression.id, onChangeValue, value],
  );

  const handleTextValueChange = useCallback(
    (text: string) => {
      const newValue = [value[0], text];
      setValue(newValue);
      onChangeValue(filterExpression.id, newValue);
    },
    [filterExpression.id, onChangeValue, value],
  );

  const handleCodeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handleCodeValueChange(event.target.value);
    },
    [handleCodeValueChange],
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handleTextValueChange(event.target.value);
    },
    [handleTextValueChange],
  );

  return (
    <>
      <TextField
        key={filterExpression.id}
        fullWidth
        select
        label="Code"
        variant="filled"
        value={value[0]}
        onChange={handleCodeChange}
        slotProps={{
          inputLabel: { shrink: true },
        }}
      >
        <MenuItem key={"-1"} value={"-1"}>
          <i>None</i>
        </MenuItem>
        {projectCodes.data?.map((code) => (
          <MenuItem key={code.id} value={code.id.toString()}>
            <CodeRenderer code={code} />
          </MenuItem>
        ))}
      </TextField>
      <TextField type="text" value={value[1]} onChange={handleTextChange} label="Text" variant="standard" fullWidth />
    </>
  );
});

export default SpanAnnotationValueSelector;
