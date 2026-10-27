import { useWithLevel } from "@components/tree-explorer";
import {
  Button,
  Checkbox,
  FormControl,
  FormControlProps,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { memo, useCallback, useId } from "react";
import { CodeHooks } from "./api/codeHooks";
import { CodeRenderer } from "./renderer";

// the selected codes shown in the field, the others are summarized as "+N more"
const MAX_VISIBLE_CODES = 3;

interface CodeSelectorProps extends Omit<FormControlProps, "onChange"> {
  codeIds: number[];
  onCodeIdsChange: (codeIds: number[]) => void;
  title: string;
}

/**
 * Selects several codes of the project from a hierarchical list. Selecting a
 * parent code does not select its children.
 */
export const CodeSelector = memo(({ codeIds, onCodeIdsChange, title, ...props }: CodeSelectorProps) => {
  // global server state (react query)
  const projectCodes = CodeHooks.useGetAllCodes();
  const codesWithLevel = useWithLevel(projectCodes.data || []);
  const labelId = useId();

  // handlers (for ui)
  const handleChange = useCallback(
    (event: SelectChangeEvent<number[]>) => {
      const value = event.target.value;
      onCodeIdsChange(typeof value === "string" ? value.split(",").map(Number) : value);
    },
    [onCodeIdsChange],
  );
  const handleSelectAll = useCallback(() => {
    onCodeIdsChange(codesWithLevel.map((codeWithLevel) => codeWithLevel.data.id));
  }, [codesWithLevel, onCodeIdsChange]);
  const handleClear = useCallback(() => {
    onCodeIdsChange([]);
  }, [onCodeIdsChange]);

  // render
  return (
    <Stack spacing={0.5}>
      <FormControl {...props}>
        <InputLabel id={labelId}>{title}</InputLabel>
        <Select
          labelId={labelId}
          label={title}
          value={codeIds}
          multiple
          onChange={handleChange}
          disabled={!projectCodes.isSuccess}
          renderValue={(selected) => (
            <Stack direction="row" gap={1} alignItems="center" overflow="hidden">
              {selected.slice(0, MAX_VISIBLE_CODES).map((codeId) => (
                <CodeRenderer key={codeId} code={codeId} />
              ))}
              {selected.length > MAX_VISIBLE_CODES && (
                <Typography variant="body2" color="textSecondary" noWrap flexShrink={0}>
                  +{selected.length - MAX_VISIBLE_CODES} more
                </Typography>
              )}
            </Stack>
          )}
        >
          {codesWithLevel.map((codeWithLevel) => (
            <MenuItem
              key={codeWithLevel.data.id}
              value={codeWithLevel.data.id}
              style={{ paddingLeft: codeWithLevel.level * 10 + 6 }}
            >
              <Checkbox checked={codeIds.includes(codeWithLevel.data.id)} />
              <ListItemText>
                <CodeRenderer code={codeWithLevel.data} />
              </ListItemText>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={handleSelectAll} disabled={!projectCodes.isSuccess}>
          Select all codes
        </Button>
        <Button size="small" onClick={handleClear} disabled={codeIds.length === 0}>
          Clear
        </Button>
      </Stack>
    </Stack>
  );
});
