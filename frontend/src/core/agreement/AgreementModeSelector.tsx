import { AgreementMode } from "@models/AgreementMode";
import {
  FormControl,
  FormControlProps,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { memo, useCallback } from "react";
import { agreementModeDescriptions, agreementModeLabels } from "./agreementUtils";

interface AgreementModeSelectorProps extends Omit<FormControlProps, "onChange"> {
  mode: AgreementMode;
  onModeChange: (mode: AgreementMode) => void;
  /** Modes that can be selected, all by default. */
  modes?: AgreementMode[];
}

export const AgreementModeSelector = memo(
  ({ mode, onModeChange, modes = Object.values(AgreementMode), ...props }: AgreementModeSelectorProps) => {
    const handleChange = useCallback(
      (event: SelectChangeEvent<AgreementMode>) => {
        onModeChange(event.target.value as AgreementMode);
      },
      [onModeChange],
    );

    return (
      <FormControl size="small" {...props}>
        <InputLabel id="agreement-mode-select-label">Scoring mode</InputLabel>
        <Select
          labelId="agreement-mode-select-label"
          label="Scoring mode"
          value={mode}
          onChange={handleChange}
          renderValue={(selected) => agreementModeLabels[selected]}
        >
          {modes.map((m) => (
            <MenuItem key={m} value={m}>
              <ListItemText
                primary={agreementModeLabels[m]}
                secondary={agreementModeDescriptions[m]}
                secondaryTypographyProps={{ sx: { whiteSpace: "normal", maxWidth: 360 } }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  },
);
