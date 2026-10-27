import { CodeRenderer } from "@core/code";
import { UserRenderer } from "@core/user";
import { Stack, Typography } from "@mui/material";
import { formatDateTime } from "@utils/DateUtils";
import { memo } from "react";

interface AnnotationProvenance {
  code_id: number;
  created: string;
  source_user_id: number | null;
  source_code_id: number | null;
}

interface AnnotationProvenanceTextProps {
  annotation: AnnotationProvenance;
}

/**
 * Tells from whom, when and with which code an annotation was accepted (e.g. in the annotation comparison).
 * Renders nothing for annotations without provenance.
 * Provenance is for transparency only: a copy is the accepting user's annotation like any other.
 */
export const AnnotationProvenanceText = memo(({ annotation }: AnnotationProvenanceTextProps) => {
  if (annotation.source_user_id === null && annotation.source_code_id === null) {
    return null;
  }
  // source user / code are SET NULL when they are deleted
  const isCodeChanged = annotation.source_code_id !== null && annotation.source_code_id !== annotation.code_id;
  return (
    <Stack
      direction="row"
      alignItems="center"
      columnGap={0.5}
      flexWrap="wrap"
      color="text.secondary"
      fontSize={12}
      sx={{ "& .MuiTypography-root": { fontSize: "inherit" } }}
    >
      <Typography variant="inherit">Accepted from</Typography>
      {annotation.source_user_id !== null ? (
        <UserRenderer user={annotation.source_user_id} />
      ) : (
        <Typography variant="inherit">a deleted user</Typography>
      )}
      <Typography variant="inherit">on {formatDateTime(annotation.created)} · original code</Typography>
      {annotation.source_code_id !== null ? (
        <CodeRenderer code={annotation.source_code_id} />
      ) : (
        <Typography variant="inherit">deleted</Typography>
      )}
      {isCodeChanged && <Typography variant="inherit">· code changed after accepting</Typography>}
    </Stack>
  );
});
