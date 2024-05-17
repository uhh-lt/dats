import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI.ts";

interface BBoxAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

function BBoxAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: BBoxAnnotationDeleteMenuItemProps & MenuItemProps) {
  const deleteMutation = BboxAnnotationHooks.useDelete();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the BBoxAnnotation ${annotationId}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate(
          { bboxId: annotationId },
          {
            onSuccess: (bboxAnnotation) => {
              SnackbarAPI.openSnackbar({
                text: `Deleted BBox Annotation ${bboxAnnotation.id}`,
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
      <ListItemText>Delete bbox annotation</ListItemText>
    </MenuItem>
  );
}

export default BBoxAnnotationDeleteMenuItem;
