import { DescribedSelect } from "@components/DescribedSelect";
import { FormControlProps } from "@mui/material";
import {
  SegmentErrorType,
  segmentErrorTypeDescriptions,
  segmentErrorTypeLabels,
  segmentErrorTypes,
} from "../_utils/agreementUtils";

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
    />
  );
}
