import { TextField, TextFieldProps } from "@mui/material";
import { Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormNumberProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type">;
}

export function FormNumber<T extends FieldValues>({ name, control, textFieldProps, ...controllerProps }: FormNumberProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => <TextField {...field} {...textFieldProps} type="number" />}
      control={control}
    />
  );
}
