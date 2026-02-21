import { TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormTextMultilineProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type" | "multiline">;
  control: Control<T>;
}

export function FormTextMultiline<T extends FieldValues>({
  name,
  control,
  textFieldProps,
  ...controllerProps
}: FormTextMultilineProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => (
        <TextField
          {...field}
          {...textFieldProps}
          type="text"
          multiline
          minRows={textFieldProps?.minRows ? textFieldProps.minRows : 5}
        />
      )}
      control={control}
    />
  );
}
