import { TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormPasswordProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type">;
  control: Control<T>;
  showPassword?: boolean;
}

export function FormPassword<T extends FieldValues>({
  name,
  control,
  textFieldProps,
  showPassword,
  ...controllerProps
}: FormPasswordProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => <TextField {...field} {...textFieldProps} type={showPassword ? "text" : "password"} />}
      control={control}
    />
  );
}
