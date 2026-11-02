import { DescribedSelect } from "@components/DescribedSelect";
import { AgreementAnnotationType } from "@models/AgreementAnnotationType";
import { AgreementScoring } from "@models/AgreementScoring";
import { FormControlProps } from "@mui/material";

const SCORINGS = [AgreementScoring.CONSTITUENTS, AgreementScoring.EXACT];

function scoringLabel(annotationType: AgreementAnnotationType, scoring: AgreementScoring): string {
  if (scoring === AgreementScoring.EXACT) return "Exact boundaries";
  return annotationType === AgreementAnnotationType.SPAN ? "Per word" : "Per sentence";
}

function scoringDescription(annotationType: AgreementAnnotationType, scoring: AgreementScoring): string {
  const constituent = annotationType === AgreementAnnotationType.SPAN ? "word" : "sentence";
  if (scoring === AgreementScoring.EXACT) {
    return (
      `Every annotation counts as a whole: it is correct only if the other annotator assigned the same code ` +
      `from exactly the same first to the same last ${constituent}. ` +
      `3 annotated ${constituent}s against 2 of them are a miss and an extra.`
    );
  }
  return (
    `Every ${constituent} counts on its own: it is correct if it carries the same code on both sides, ` +
    `wherever the annotations begin or end. 3 annotated ${constituent}s against 2 of them: 2 of 3 are correct.`
  );
}

interface AgreementScoringSelectorProps extends Omit<FormControlProps, "onChange"> {
  /** The labels and descriptions depend on the annotation type (words or sentences). */
  annotationType: AgreementAnnotationType;
  scoring: AgreementScoring;
  onScoringChange: (scoring: AgreementScoring) => void;
}

/** Selects the scoring of an agreement evaluation; the open menu explains every scoring. */
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
