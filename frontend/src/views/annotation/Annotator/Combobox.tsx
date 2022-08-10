import { createFilterOptions, Autocomplete, Box, TextField } from "@mui/material";
import React from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";

const filter = createFilterOptions<TagOptionType>();

interface TagOptionType {
  inputValue?: string;
  title: string;
  color?: string;
  id?: number;
}

export function Combobox(props: { onAdd: any; onDelete: any }) {
  const [value, setValue] = React.useState<TagOptionType | null>(null);

  let tags = useAppSelector((state) => state.annotations.codesForSelection);

  const optionTags: TagOptionType[] = tags.map((t) => ({
    inputValue: t.name,
    title: t.name,
    color: t.color,
    id: t.id,
  }));

  return (
    <Autocomplete
      value={value}
      onChange={(event, newValue) => {
        if (typeof newValue === "string") {
          setValue({
            title: newValue,
          });
        } else if (newValue && newValue.title && newValue.color) {
          setValue(newValue);
          props.onAdd({ id: newValue!.id, name: newValue!.title, color: newValue!.color });
        } else if (newValue && newValue.inputValue) {
          // Create a new value from the user input
          setValue({
            title: newValue.inputValue,
          });
          props.onAdd({ name: newValue.inputValue });
        }
      }}
      filterOptions={(options, params) => {
        const filtered = filter(options, params);

        const { inputValue } = params;
        // Suggest the creation of a new value
        const isExisting = options.some((option) => inputValue === option.title);
        if (inputValue !== "" && !isExisting) {
          filtered.push({
            inputValue,
            title: `Add "${inputValue}"`,
          });
        }

        return filtered;
      }}
      open
      autoComplete
      autoHighlight
      autoSelect
      disablePortal
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      freeSolo
      id="free-solo-with-text-demo"
      options={optionTags}
      getOptionLabel={(option) => {
        // Value selected with enter, right from the input
        if (typeof option === "string") {
          return option;
        }
        // Add "xxx" option created dynamically
        if (option.inputValue) {
          return option.inputValue;
        }
        // Regular option
        return option.title;
      }}
      onClose={(event, reason) => {
        if (reason === "escape") props.onDelete();
      }}
      renderOption={(props, option) => (
        <li {...props}>
          <Box style={{ width: 20, height: 20, backgroundColor: option.color, marginRight: 8 }}></Box> {option.title}
        </li>
      )}
      style={{ width: 200 }}
      renderInput={(params) => <TextField autoFocus {...params} label="Search tags" />}
    />
  );
}
