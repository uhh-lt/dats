import { PromptSettings } from "@models/PromptSettings";
import { TextField } from "@mui/material";
import { ChangeEvent, useCallback } from "react";

interface SettingFieldProps {
  label: string;
  field: keyof PromptSettings;
  settings: Required<PromptSettings>;
  step?: number;
  onChangeSettings: (settings: Required<PromptSettings>) => void;
}

/** A number input for one setting of a block. */
export function SettingField({ label, field, settings, step = 1, onChangeSettings }: SettingFieldProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = Number(event.target.value);
      if (Number.isNaN(value)) return;
      onChangeSettings({ ...settings, [field]: value });
    },
    [field, settings, onChangeSettings],
  );
  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={settings[field]}
      onChange={handleChange}
      slotProps={{ htmlInput: { step, min: 0 } }}
      sx={{ flex: "1 1 120px" }}
    />
  );
}
