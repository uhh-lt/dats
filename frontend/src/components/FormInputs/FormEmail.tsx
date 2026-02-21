import { TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormEmailProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type">;
  control: Control<T>;
}

export function FormEmail<T extends FieldValues>({ name, control, textFieldProps, ...controllerProps }: FormEmailProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => <TextField {...field} {...textFieldProps} type="email" />}
      control={control}
    />
  );
}
