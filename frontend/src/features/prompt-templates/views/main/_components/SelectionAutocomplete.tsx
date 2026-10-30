import { Autocomplete, TextField } from "@mui/material";
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

/** Selects the tags or metadata fields a selection block of the prompt shows. */
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
      limitTags={3}
      options={allOptions}
      value={selected}
      onChange={handleChange}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(params) => <TextField {...params} label={label} placeholder={label} />}
    />
  );
}
