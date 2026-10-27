import {
  FormControl,
  FormControlProps,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { useCallback, useId } from "react";

interface DescribedSelectProps<T extends string> extends Omit<FormControlProps, "onChange"> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  getOptionLabel: (option: T) => string;
  /** Shown below the label of every option in the open menu. */
  getOptionDescription: (option: T) => string;
}

/** A select whose options explain themselves: every option shows a label and a description. */
export function DescribedSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  getOptionLabel,
  getOptionDescription,
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
              primary={getOptionLabel(option)}
              secondary={getOptionDescription(option)}
              secondaryTypographyProps={{ sx: { whiteSpace: "normal", maxWidth: 400 } }}
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
