import { getIconComponent, Icon } from "@components/icons";
import { UserRead } from "@models/UserRead";
import { Autocomplete, ListItemIcon, ListItemText, TextField } from "@mui/material";
import { memo, SyntheticEvent, useCallback, useMemo } from "react";
import { UserHooks } from "../api/userHooks";
import { AnnotateAsChoice } from "./annotateAsUtils";

interface AnnotateAsSelectorProps {
  value: AnnotateAsChoice | null;
  onChange: (value: AnnotateAsChoice | null) => void;
  label?: string;
}

/**
 * Selects the virtual annotator a run (LLM Assistant, classifier) writes its annotations into: an existing virtual
 * annotator of the project, or a new one named here, which the caller creates before starting the run.
 * Runs never write into a human user's annotations.
 */
export const AnnotateAsSelector = memo(({ value, onChange, label = "Annotate as" }: AnnotateAsSelectorProps) => {
  const virtualAnnotators = UserHooks.useGetVirtualAnnotators();

  const toChoice = useCallback(
    (name: string): AnnotateAsChoice | null => {
      const trimmed = name.trim();
      if (trimmed.length === 0) return null;
      const existing = virtualAnnotators.data?.find((annotator) => annotator.first_name === trimmed);
      return existing ? { userId: existing.id } : { newName: trimmed };
    },
    [virtualAnnotators.data],
  );

  const handleChange = useCallback(
    (_event: SyntheticEvent, newValue: string | UserRead | null) => {
      if (newValue === null) return onChange(null);
      onChange(typeof newValue === "string" ? toChoice(newValue) : { userId: newValue.id });
    },
    [onChange, toChoice],
  );
  const handleInputChange = useCallback(
    (_event: SyntheticEvent, newInputValue: string, reason: string) => {
      if (reason === "input") onChange(toChoice(newInputValue));
    },
    [onChange, toChoice],
  );

  const selected = useMemo(() => {
    if (value === null) return null;
    if ("newName" in value) return value.newName;
    return virtualAnnotators.data?.find((annotator) => annotator.id === value.userId) ?? null;
  }, [value, virtualAnnotators.data]);

  const helperText =
    value === null
      ? "Select a virtual annotator or enter the name of a new one"
      : "newName" in value
        ? `Creates the new virtual annotator "${value.newName}"`
        : "Writes into the annotations of this virtual annotator";

  return (
    <Autocomplete
      freeSolo
      options={virtualAnnotators.data ?? []}
      loading={virtualAnnotators.isLoading}
      value={selected}
      onChange={handleChange}
      onInputChange={handleInputChange}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.first_name)}
      isOptionEqualToValue={(option, other) => typeof other !== "string" && option.id === other.id}
      renderOption={({ key, ...props }, option) => (
        <li key={key} {...props}>
          <ListItemIcon>{getIconComponent(Icon.VIRTUAL_ANNOTATOR)}</ListItemIcon>
          <ListItemText>{option.first_name}</ListItemText>
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} helperText={helperText} error={value === null} required />
      )}
    />
  );
});
