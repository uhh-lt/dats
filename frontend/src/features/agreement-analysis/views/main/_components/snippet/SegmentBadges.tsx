import { AnnotationIdChip } from "@core/annotation";
import { CodeRenderer } from "@core/code";
import { AgreementSegment } from "@models/AgreementSegment";
import { Chip, Stack, Typography } from "@mui/material";
import { memo } from "react";

function CodeChipLabel({ prefix, codeId }: { prefix: string; codeId: number }) {
  return (
    <Stack direction="row" gap={0.5} alignItems="center">
      {prefix} <CodeRenderer code={codeId} />
    </Stack>
  );
}

interface SegmentBadgesProps {
  segment: AgreementSegment;
}

/** What the compared annotator missed or added in the segment, and the (copyable) annotation IDs. */
export const SegmentBadges = memo(({ segment }: SegmentBadgesProps) => {
  const missed = segment.false_negative_code_ids;
  const extra = segment.false_positive_code_ids;
  const matched = segment.true_positive_code_ids;
  const referenceIds = segment.reference_annotation_ids;
  const comparedIds = segment.compared_annotation_ids;

  return (
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
      {missed.map((codeId) => (
        <Chip
          key={`fn-${codeId}`}
          size="small"
          color="error"
          label={<CodeChipLabel prefix="missed" codeId={codeId} />}
        />
      ))}
      {extra.map((codeId) => (
        <Chip
          key={`fp-${codeId}`}
          size="small"
          color="warning"
          label={<CodeChipLabel prefix="extra" codeId={codeId} />}
        />
      ))}
      {missed.length === 0 &&
        extra.length === 0 &&
        matched.map((codeId) => (
          <Chip
            key={`tp-${codeId}`}
            size="small"
            color="success"
            label={<CodeChipLabel prefix="match" codeId={codeId} />}
          />
        ))}
      <Typography variant="caption" color="textSecondary" ml={1}>
        IDs
      </Typography>
      {referenceIds.map((annotationId) => (
        <AnnotationIdChip key={`r-${annotationId}`} annotationId={annotationId} />
      ))}
      {referenceIds.length > 0 && comparedIds.length > 0 && (
        <Typography variant="caption" color="textSecondary">
          vs.
        </Typography>
      )}
      {comparedIds.map((annotationId) => (
        <AnnotationIdChip key={`c-${annotationId}`} annotationId={annotationId} />
      ))}
    </Stack>
  );
});
