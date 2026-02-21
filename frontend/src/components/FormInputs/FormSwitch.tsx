import { Box, BoxProps, Switch, SwitchProps } from "@mui/material";
import { Controller, ControllerProps, FieldValues } from "react-hook-form";

interface FormSwitchProps<T extends FieldValues> extends Omit<ControllerProps<T>, "render"> {
  boxProps?: BoxProps;
  switchProps?: Omit<SwitchProps, "checked" | "onChange">;
}

export function FormSwitch<T extends FieldValues>({
  name,
  control,
  boxProps,
  switchProps,
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
            onChange={(e) => field.onChange(e.target.checked)}
          />
        </Box>
      )}
      control={control}
    />
  );
}
