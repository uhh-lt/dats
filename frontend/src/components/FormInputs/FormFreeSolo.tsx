import { Autocomplete, TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormFreeSoloProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type">;
  control: Control<T>;
  options: string[];
}

function FormFreeSolo<T extends FieldValues>({
  name,
  control,
  options,
  textFieldProps,
  ...controllerProps
}: FormFreeSoloProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => (
        <Autocomplete
          {...field}
          value={field.value}
          onChange={(_, newValue) => {
            field.onChange(newValue || "");
          }}
          inputValue={field.value}
          getOptionLabel={(option) => option}
          onInputChange={(_, newInputValue) => {
            field.onChange(newInputValue);
          }}
          freeSolo
          fullWidth
          options={options}
          renderInput={(params) => <TextField {...textFieldProps} {...params} />}
        />
      )}
      control={control}
    />
  );
}

export default FormFreeSolo;
