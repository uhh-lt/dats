import { UserRenderer } from "@core/user";
import { Typography } from "@mui/material";
import { memo } from "react";

interface AnnotationSourceUserProps {
  annotation: {
    source_user_id: number | null;
    source_code_id: number | null;
  };
}

/**
 * The user an annotation was accepted from ("Accepted from" column). Empty for annotations without provenance.
 * Like the explorer cards, a copy whose source user was deleted (SET NULL) says "a deleted user".
 */
export const AnnotationSourceUser = memo(({ annotation }: AnnotationSourceUserProps) => {
  if (annotation.source_user_id !== null) {
    return <UserRenderer user={annotation.source_user_id} />;
  }
  if (annotation.source_code_id !== null) {
    return (
      <Typography variant="inherit" color="text.secondary">
        a deleted user
      </Typography>
    );
  }
  return null;
});
