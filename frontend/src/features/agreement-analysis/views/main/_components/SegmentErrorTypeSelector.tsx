import { DescribedSelect } from "@components/DescribedSelect";
import { Chip, FormControlProps, Stack } from "@mui/material";
import { ReactNode } from "react";
import {
  SegmentErrorType,
  segmentErrorTypeDescriptions,
  segmentErrorTypeLabels,
  segmentErrorTypes,
} from "../_utils/agreementUtils";

const missedChip = <Chip size="small" color="error" label="missed" />;
const extraChip = <Chip size="small" color="warning" label="extra" />;

// the chips of the segment rows that the error type shows
const segmentErrorTypeChips: Record<SegmentErrorType, ReactNode> = {
  disagreement: null,
  false_negative: missedChip,
  false_positive: extraChip,
  confusion: (
    <Stack direction="row" gap={0.5}>
      {missedChip}
      {extraChip}
    </Stack>
  ),
  agreement: <Chip size="small" color="success" label="match" />,
  all: null,
};

interface SegmentErrorTypeSelectorProps extends Omit<FormControlProps, "onChange"> {
  errorType: SegmentErrorType;
  onErrorTypeChange: (errorType: SegmentErrorType) => void;
}

export function SegmentErrorTypeSelector({ errorType, onErrorTypeChange, ...props }: SegmentErrorTypeSelectorProps) {
  return (
    <DescribedSelect
      {...props}
      label="Error type"
      value={errorType}
      options={segmentErrorTypes}
      onChange={onErrorTypeChange}
      getOptionLabel={(option) => segmentErrorTypeLabels[option]}
      getOptionDescription={(option) => segmentErrorTypeDescriptions[option]}
      getOptionAdornment={(option) => segmentErrorTypeChips[option]}
    />
  );
}
