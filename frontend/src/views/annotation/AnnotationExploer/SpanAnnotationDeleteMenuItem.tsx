import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";

interface SpanAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

function SpanAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: SpanAnnotationDeleteMenuItemProps & MenuItemProps) {
  const deleteMutation = SpanAnnotationHooks.useDeleteSpan();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotationId}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate(
          { spanId: annotationId },
          {
            onSuccess: (spanAnnotation) => {
              openSnackbar({
                text: `Deleted Span Annotation ${spanAnnotation.id}`,
                severity: "success",
              });
            },
          },
        );
      },
    });

    if (onClick) onClick();
  };

  return (
    <MenuItem onClick={handleClick} {...props}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete span annotation</ListItemText>
    </MenuItem>
  );
}

export default SpanAnnotationDeleteMenuItem;
