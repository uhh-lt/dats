import { TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormTextMultilineProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type" | "multiline" | "minRows">;
  control: Control<T>;
}

function FormTextMultiline<T extends FieldValues>({
  name,
  control,
  textFieldProps,
  ...controllerProps
}: FormTextMultilineProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => <TextField {...field} {...textFieldProps} type="text" multiline minRows={5} />}
      control={control}
    />
  );
}

export default FormTextMultiline;
