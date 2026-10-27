import { UserRenderer } from "@core/user";
import { Stack } from "@mui/material";
import { memo } from "react";
import { AnnotationProvenance, AnnotationProvenanceBadge } from "./AnnotationProvenanceBadge";

interface AnnotationSourceUserProps {
  annotation: AnnotationProvenance;
}

/**
 * The user an annotation was accepted from ("Accepted from" column), with the provenance badge. Empty for
 * annotations without provenance.
 */
export const AnnotationSourceUser = memo(({ annotation }: AnnotationSourceUserProps) => {
  return (
    <Stack direction="row" alignItems="center" gap={0.5} minWidth={0}>
      <AnnotationProvenanceBadge annotation={annotation} />
      {annotation.source_user_id !== null && <UserRenderer user={annotation.source_user_id} />}
    </Stack>
  );
});
