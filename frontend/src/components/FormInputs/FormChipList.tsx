import { Autocomplete, AutocompleteProps, Chip, TextField, TextFieldProps } from "@mui/material";
import { Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormChipListProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange">;
  autoCompleteProps?: Omit<
    AutocompleteProps<string, true, true, true>,
    "value" | "onChange" | "renderTags" | "renderInput" | "options" | "multiple" | "freeSolo" | "disableClearable"
  >;
}

function FormChipList<T extends FieldValues>({
  name,
  control,
  textFieldProps,
  autoCompleteProps,
  ...controllerProps
}: FormChipListProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      control={control}
      render={({ field }) => {
        return (
          <Autocomplete
            {...autoCompleteProps}
            value={field.value ? [...field.value] : []}
            onChange={(_, newValue) => {
              field.onChange(newValue);
            }}
            disableClearable
            multiple
            options={[]}
            freeSolo
            renderTags={(value: readonly string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip
                  style={{ borderRadius: "4px", height: "100%" }}
                  variant="filled"
                  label={option}
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => <TextField {...textFieldProps} {...params} />}
          />
        );
      }}
    />
  );
}

export default FormChipList;
