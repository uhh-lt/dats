import { DescribedSelect } from "@components/DescribedSelect";
import { AgreementAnnotationType } from "@models/AgreementAnnotationType";
import { FormControlProps } from "@mui/material";
import { annotationTypeDescriptions, annotationTypeLabels } from "../_utils/agreementUtils";

const ANNOTATION_TYPES = Object.values(AgreementAnnotationType);

interface AgreementAnnotationTypeSelectorProps extends Omit<FormControlProps, "onChange"> {
  annotationType: AgreementAnnotationType;
  onAnnotationTypeChange: (annotationType: AgreementAnnotationType) => void;
}

export function AgreementAnnotationTypeSelector({
  annotationType,
  onAnnotationTypeChange,
  ...props
}: AgreementAnnotationTypeSelectorProps) {
  return (
    <DescribedSelect
      {...props}
      label="Annotation type"
      value={annotationType}
      options={ANNOTATION_TYPES}
      onChange={onAnnotationTypeChange}
      getOptionLabel={(option) => annotationTypeLabels[option]}
      getOptionDescription={(option) => annotationTypeDescriptions[option]}
    />
  );
}
