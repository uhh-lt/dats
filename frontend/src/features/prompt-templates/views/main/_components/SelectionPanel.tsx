import { Autocomplete, Chip, TextField } from "@mui/material";
import { useCallback, useMemo } from "react";

export interface SelectionOption {
  id: number;
  label: string;
}

interface SelectionPanelProps {
  label: string;
  // the current project data that can be selected
  options: SelectionOption[];
  // the snapshots the prompt stores, labelled as they were saved
  selected: SelectionOption[];
  // ids of selections whose project data changed or was deleted since they were saved
  outdatedIds: Set<number>;
  onChange: (ids: number[]) => void;
}

/** Selects the codes, tags or metadata fields a selection block of the prompt shows. */
export function SelectionPanel({ label, options, selected, outdatedIds, onChange }: SelectionPanelProps) {
  // selections whose project data was deleted are still shown until they are removed or refreshed
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
      renderTags={(value, getTagProps) =>
        value.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return (
            <Chip
              key={key}
              size="small"
              label={outdatedIds.has(option.id) ? `${option.label} (outdated)` : option.label}
              color={outdatedIds.has(option.id) ? "warning" : "default"}
              {...tagProps}
            />
          );
        })
      }
      renderInput={(params) => <TextField {...params} label={label} placeholder={label} />}
    />
  );
}
