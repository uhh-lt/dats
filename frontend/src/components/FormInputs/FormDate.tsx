import { TextField, TextFieldProps } from "@mui/material";
import { Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormDateProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type">;
}

export function FormDate<T extends FieldValues>({ name, control, textFieldProps, ...controllerProps }: FormDateProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => <TextField {...field} {...textFieldProps} type="date" />}
      control={control}
    />
  );
}
