import { useOpenSnackbar } from "@core/notification";
import { Chip, ChipProps, Tooltip } from "@mui/material";
import { MouseEvent, memo, useCallback } from "react";

interface AnnotationIdChipProps extends Omit<ChipProps, "label" | "onClick"> {
  annotationId: number;
}

/**
 * Shows an annotation ID; clicking it copies the ID to the clipboard, so that
 * annotations can be referenced in external logs and via the API.
 */
export const AnnotationIdChip = memo(({ annotationId, ...props }: AnnotationIdChipProps) => {
  const openSnackbar = useOpenSnackbar();

  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      navigator.clipboard
        .writeText(`${annotationId}`)
        .then(() => openSnackbar({ text: `Copied annotation ID ${annotationId}`, severity: "success" }))
        .catch(() => openSnackbar({ text: "Failed to copy the annotation ID", severity: "error" }));
    },
    [annotationId, openSnackbar],
  );

  return (
    <Tooltip title="Annotation ID (click to copy)">
      <Chip label={`#${annotationId}`} size="small" variant="outlined" onClick={handleClick} {...props} />
    </Tooltip>
  );
});
