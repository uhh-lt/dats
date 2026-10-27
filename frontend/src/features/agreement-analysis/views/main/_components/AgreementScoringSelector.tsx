import { DescribedSelect } from "@components/DescribedSelect";
import { AgreementAnnotationType } from "@models/AgreementAnnotationType";
import { AgreementScoring } from "@models/AgreementScoring";
import { FormControlProps } from "@mui/material";
import { scoringDescription, scoringLabel } from "../_utils/agreementUtils";

const SCORINGS = [AgreementScoring.CONSTITUENTS, AgreementScoring.EXACT];

interface AgreementScoringSelectorProps extends Omit<FormControlProps, "onChange"> {
  /** The labels and descriptions depend on the annotation type (words or sentences). */
  annotationType: AgreementAnnotationType;
  scoring: AgreementScoring;
  onScoringChange: (scoring: AgreementScoring) => void;
}

export function AgreementScoringSelector({
  annotationType,
  scoring,
  onScoringChange,
  ...props
}: AgreementScoringSelectorProps) {
  return (
    <DescribedSelect
      {...props}
      label="Scoring"
      value={scoring}
      options={SCORINGS}
      onChange={onScoringChange}
      getOptionLabel={(option) => scoringLabel(annotationType, option)}
      getOptionDescription={(option) => scoringDescription(annotationType, option)}
    />
  );
}
