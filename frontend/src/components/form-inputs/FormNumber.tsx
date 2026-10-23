import { TextField, TextFieldProps } from "@mui/material";
import { Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormNumberProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type">;
}

/**
 * A number input for React Hook Form. The field value is a number, or null while the input is empty (so a `required`
 * rule reports it); the input's string value never reaches the form.
 */
export function FormNumber<T extends FieldValues>({
  name,
  control,
  textFieldProps,
  ...controllerProps
}: FormNumberProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => (
        <TextField
          {...field}
          {...textFieldProps}
          type="number"
          value={field.value ?? ""}
          onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))}
        />
      )}
      control={control}
    />
  );
}
