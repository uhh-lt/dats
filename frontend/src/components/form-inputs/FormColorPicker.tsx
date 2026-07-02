import { Box, Stack, TextField, TextFieldProps } from "@mui/material";
import { HexColorPicker } from "react-colorful";
import { Control, Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormTextProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  textFieldProps?: Omit<TextFieldProps, "value" | "onChange" | "type">;
  control: Control<T>;
}

export function FormColorPicker<T extends FieldValues>({
  name,
  control,
  textFieldProps,
  ...controllerProps
}: FormTextProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => (
        <>
          <Stack direction="row">
            <TextField {...field} {...textFieldProps} type="text" />
            <Box sx={{ width: 48, height: 48, backgroundColor: field.value, ml: 1, flexShrink: 0 }} />
          </Stack>
          <HexColorPicker style={{ width: "100%" }} color={field.value} onChange={field.onChange} />
        </>
      )}
      control={control}
    />
  );
}
