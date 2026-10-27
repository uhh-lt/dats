import { AnnotationIdChip } from "@core/annotation";
import { CodeRenderer } from "@core/code";
import { AgreementSegment } from "@models/AgreementSegment";
import { Chip, Stack, Typography } from "@mui/material";
import { memo } from "react";

function CodeList({ codeIds }: { codeIds: number[] }) {
  if (codeIds.length === 0) {
    return (
      <Typography variant="body2" fontStyle="italic">
        no code
      </Typography>
    );
  }
  return (
    <Stack direction="row" gap={1} flexWrap="wrap">
      {codeIds.map((codeId) => (
        <CodeRenderer key={codeId} code={codeId} />
      ))}
    </Stack>
  );
}

function CodeChipLabel({ prefix, codeId }: { prefix: string; codeId: number }) {
  return (
    <Stack direction="row" gap={0.5} alignItems="center">
      {prefix} <CodeRenderer code={codeId} />
    </Stack>
  );
}

function AnnotationIds({ label, annotationIds }: { label: string; annotationIds: number[] }) {
  if (annotationIds.length === 0) return null;
  return (
    <Stack direction="row" gap={0.5} alignItems="center" flexWrap="wrap">
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      {annotationIds.map((annotationId) => (
        <AnnotationIdChip key={annotationId} annotationId={annotationId} />
      ))}
    </Stack>
  );
}

interface AgreementSegmentSummaryProps {
  segment: AgreementSegment;
}

/** The codes of both annotators in a segment, its errors and the (copyable) annotation IDs. */
export const AgreementSegmentSummary = memo(({ segment }: AgreementSegmentSummaryProps) => {
  const isAgreement = segment.false_negative_code_ids.length === 0 && segment.false_positive_code_ids.length === 0;
  return (
    <Stack gap={0.5}>
      <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
        <Stack direction="row" gap={1} alignItems="center">
          <Typography variant="caption" color="textSecondary">
            Reference:
          </Typography>
          <CodeList codeIds={segment.reference_code_ids} />
        </Stack>
        <Stack direction="row" gap={1} alignItems="center">
          <Typography variant="caption" color="textSecondary">
            Compared:
          </Typography>
          <CodeList codeIds={segment.compared_code_ids} />
        </Stack>
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {isAgreement && <Chip size="small" color="success" label="agreement" />}
        {segment.false_negative_code_ids.map((codeId) => (
          <Chip
            key={`fn-${codeId}`}
            size="small"
            color="error"
            label={<CodeChipLabel prefix="missed" codeId={codeId} />}
          />
        ))}
        {segment.false_positive_code_ids.map((codeId) => (
          <Chip
            key={`fp-${codeId}`}
            size="small"
            color="warning"
            label={<CodeChipLabel prefix="extra" codeId={codeId} />}
          />
        ))}
      </Stack>
      <Stack direction="row" gap={2} flexWrap="wrap">
        <AnnotationIds label="Reference IDs:" annotationIds={segment.reference_annotation_ids} />
        <AnnotationIds label="Compared IDs:" annotationIds={segment.compared_annotation_ids} />
      </Stack>
    </Stack>
  );
});
