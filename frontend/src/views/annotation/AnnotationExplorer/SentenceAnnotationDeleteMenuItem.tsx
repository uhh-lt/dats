import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import SentenceAnnotationHooks from "../../../api/SentenceAnnotationHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";

interface SentenceAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

function SentenceAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: SentenceAnnotationDeleteMenuItemProps & MenuItemProps) {
  const deleteMutation = SentenceAnnotationHooks.useDeleteSentenceAnnotation();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the SentenceAnnotation ${annotationId}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate(annotationId);
      },
    });

    if (onClick) onClick();
  };

  return (
    <MenuItem onClick={handleClick} {...props}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete sentence annotation</ListItemText>
    </MenuItem>
  );
}

export default SentenceAnnotationDeleteMenuItem;
