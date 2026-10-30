import { OneRowChips } from "@components/OneRowChips";
import { oneRowChipsAutocompleteSx } from "@components/oneRowChipsSx";
import { Autocomplete, Box, Checkbox, Chip, TextField } from "@mui/material";
import { useCallback, useMemo } from "react";

export interface SelectionOption {
  id: number;
  label: string;
}

interface SelectionAutocompleteProps {
  label: string;
  // the current project data that can be selected
  options: SelectionOption[];
  // the selections of the prompt, labelled as the prompt defines them
  selected: SelectionOption[];
  onChange: (ids: number[]) => void;
}

/** Selects the tags or metadata fields a selection block of the prompt shows; the field stays one row high. */
export function SelectionAutocomplete({ label, options, selected, onChange }: SelectionAutocompleteProps) {
  // selections whose project data was deleted are still shown until they are removed
  const allOptions = useMemo(
    () => [...options, ...selected.filter((selection) => !options.some((option) => option.id === selection.id))],
    [options, selected],
  );
  const handleChange = useCallback(
    (_: unknown, value: SelectionOption[]) => onChange(value.map((option) => option.id)),
    [onChange],
  );
  return (
    <Autocomplete
      multiple
      size="small"
      fullWidth
      disableCloseOnSelect
      options={allOptions}
      value={selected}
      onChange={handleChange}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      sx={selected.length > 0 ? oneRowChipsAutocompleteSx : undefined}
      renderTags={(value, getTagProps) => (
        <OneRowChips>
          {value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return <Chip key={key} size="small" variant="outlined" label={option.label} {...tagProps} />;
          })}
        </OneRowChips>
      )}
      renderOption={({ key, ...props }, option, { selected: isSelected }) => (
        <Box component="li" key={key} {...props}>
          <Checkbox size="small" checked={isSelected} sx={{ p: 0.5, mr: 0.5 }} />
          {option.label}
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={selected.length === 0 ? label : undefined} />
      )}
    />
  );
}
