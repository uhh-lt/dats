import { TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormMenu<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type" | "select" | "children">;
  control: Control<T>;
  children: React.ReactNode;
}

export function FormMenu<T extends FieldValues>({ name, control, textFieldProps, children, ...controllerProps }: FormMenu<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => (
        <TextField {...field} {...textFieldProps} type="text" select>
          {children}
        </TextField>
      )}
      control={control}
    />
  );
}
