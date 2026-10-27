import { FormControl, FormControlProps, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { memo, useCallback } from "react";
import { SegmentErrorType, segmentErrorTypeLabels } from "./agreementUtils";

interface SegmentErrorTypeSelectorProps extends Omit<FormControlProps, "onChange"> {
  errorType: SegmentErrorType;
  onErrorTypeChange: (errorType: SegmentErrorType) => void;
}

export const SegmentErrorTypeSelector = memo(
  ({ errorType, onErrorTypeChange, ...props }: SegmentErrorTypeSelectorProps) => {
    const handleChange = useCallback(
      (event: SelectChangeEvent<SegmentErrorType>) => {
        onErrorTypeChange(event.target.value as SegmentErrorType);
      },
      [onErrorTypeChange],
    );

    return (
      <FormControl size="small" {...props}>
        <InputLabel id="segment-error-type-select-label">Error type</InputLabel>
        <Select labelId="segment-error-type-select-label" label="Error type" value={errorType} onChange={handleChange}>
          {Object.values(SegmentErrorType).map((type) => (
            <MenuItem key={type} value={type}>
              {segmentErrorTypeLabels[type]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  },
);
