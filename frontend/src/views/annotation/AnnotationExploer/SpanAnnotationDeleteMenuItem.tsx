import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../../../features/SnackbarDialog/SnackbarAPI.ts";

interface SpanAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

function SpanAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: SpanAnnotationDeleteMenuItemProps & MenuItemProps) {
  const deleteMutation = SpanAnnotationHooks.useDelete();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotationId}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate(
          { spanId: annotationId },
          {
            onSuccess: (spanAnnotation) => {
              SnackbarAPI.openSnackbar({
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
