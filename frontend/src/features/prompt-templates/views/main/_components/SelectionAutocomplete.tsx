import { Autocomplete, Box, Checkbox, TextField } from "@mui/material";
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

/**
 * Selects the tags or metadata fields a selection block of the prompt shows. The field shows no chips, because the
 * block lists the selections below it; the menu checks them.
 */
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
      renderTags={() => null}
      renderOption={({ key, ...props }, option, { selected: isSelected }) => (
        <Box component="li" key={key} {...props}>
          <Checkbox size="small" checked={isSelected} sx={{ p: 0.5, mr: 0.5 }} />
          {option.label}
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={`Add or remove ${label.toLowerCase()}`} />
      )}
    />
  );
}
