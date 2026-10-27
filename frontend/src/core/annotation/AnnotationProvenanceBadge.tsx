import { getIconComponent, Icon } from "@components/icons";
import { CodeRenderer } from "@core/code";
import { UserRenderer } from "@core/user";
import { Stack, Tooltip, Typography } from "@mui/material";
import { formatDateTime } from "@utils/DateUtils";
import { memo } from "react";

/**
 * The provenance of an annotation, as every annotation Read DTO and search row carries it.
 */
export interface AnnotationProvenance {
  code_id: number;
  created: string;
  source_user_id: number | null;
  source_code_id: number | null;
}

interface AnnotationProvenanceBadgeProps {
  annotation: AnnotationProvenance;
}

/**
 * Marks an annotation that was copied from another annotation (e.g. accepted in the annotation comparison).
 * The tooltip tells from whom, when and with which code. Renders nothing for annotations without provenance.
 * Provenance is for transparency only: a copy is the accepting user's annotation like any other.
 */
export const AnnotationProvenanceBadge = memo(({ annotation }: AnnotationProvenanceBadgeProps) => {
  if (annotation.source_user_id === null && annotation.source_code_id === null) {
    return null;
  }
  return (
    <Tooltip title={<AnnotationProvenanceTooltip annotation={annotation} />}>
      <Stack component="span" direction="row" alignItems="center" flexShrink={0} color="text.secondary">
        {getIconComponent(Icon.ANNOTATION_PROVENANCE, { fontSize: "inherit", style: { flexShrink: 0 } })}
      </Stack>
    </Tooltip>
  );
});

function AnnotationProvenanceTooltip({ annotation }: AnnotationProvenanceBadgeProps) {
  // source user / code are SET NULL when they are deleted
  const isCodeChanged = annotation.source_code_id !== null && annotation.source_code_id !== annotation.code_id;
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
        <Typography variant="inherit">Accepted from</Typography>
        {annotation.source_user_id !== null ? (
          <UserRenderer user={annotation.source_user_id} />
        ) : (
          <Typography variant="inherit">a deleted user</Typography>
        )}
        <Typography variant="inherit">on {formatDateTime(annotation.created)}</Typography>
      </Stack>
      <Stack direction="row" alignItems="center" gap={0.5}>
        <Typography variant="inherit">Original code:</Typography>
        {annotation.source_code_id !== null ? (
          <CodeRenderer code={annotation.source_code_id} />
        ) : (
          <Typography variant="inherit">deleted</Typography>
        )}
      </Stack>
      {isCodeChanged && <Typography variant="inherit">Code changed after accepting</Typography>}
    </Stack>
  );
}
