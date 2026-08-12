import { Box, BoxProps, Switch, SwitchProps } from "@mui/material";
import { Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormSwitchProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  boxProps?: BoxProps;
  switchProps?: Omit<SwitchProps, "checked" | "onChange">;
  onValueChange?: (checked: boolean) => void;
}

export function FormSwitch<T extends FieldValues>({
  name,
  control,
  boxProps,
  switchProps,
  onValueChange,
  ...controllerProps
}: FormSwitchProps<T>) {
  return (
    <Controller
      {...controllerProps}
      name={name}
      render={({ field }) => (
        <Box {...boxProps}>
          <Switch
            {...field}
            {...switchProps}
            checked={field.value === null ? false : field.value}
            onChange={(event) => {
              field.onChange(event.target.checked);
              onValueChange?.(event.target.checked);
            }}
          />
        </Box>
      )}
      control={control}
    />
  );
}
