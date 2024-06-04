import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";

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

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the BBoxAnnotation ${annotationId}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate(
          { bboxId: annotationId },
          {
            onSuccess: (bboxAnnotation) => {
              openSnackbar({
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
