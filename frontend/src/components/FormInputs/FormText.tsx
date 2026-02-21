import { TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormTextProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type">;
  control: Control<T>;
}

export function FormText<T extends FieldValues>({ name, control, textFieldProps, ...controllerProps }: FormTextProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => <TextField {...field} {...textFieldProps} type="text" />}
      control={control}
    />
  );
}
