import {
  FormControl,
  FormControlProps,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
} from "@mui/material";
import { ReactNode, useCallback, useId } from "react";

interface DescribedSelectProps<T extends string> extends Omit<FormControlProps, "onChange"> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  getOptionLabel: (option: T) => string;
  /** Shown below the label of every option in the open menu. */
  getOptionDescription: (option: T) => string;
  /** Shown next to the label of every option in the open menu, e.g. chips. */
  getOptionAdornment?: (option: T) => ReactNode;
}

/** A select whose options explain themselves: every option shows a label and a description. */
export function DescribedSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  getOptionLabel,
  getOptionDescription,
  getOptionAdornment,
  ...props
}: DescribedSelectProps<T>) {
  const labelId = useId();

  const handleChange = useCallback(
    (event: SelectChangeEvent<T>) => {
      const option = options.find((o) => o === event.target.value);
      if (option !== undefined) onChange(option);
    },
    [options, onChange],
  );

  return (
    <FormControl size="small" {...props}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select labelId={labelId} label={label} value={value} onChange={handleChange} renderValue={getOptionLabel}>
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            <ListItemText
              primary={
                <Stack direction="row" gap={1} alignItems="center">
                  {getOptionLabel(option)}
                  {getOptionAdornment?.(option)}
                </Stack>
              }
              secondary={getOptionDescription(option)}
              secondaryTypographyProps={{ sx: { whiteSpace: "normal", maxWidth: 400 } }}
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
