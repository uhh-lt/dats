import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React, { useCallback } from "react";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";

interface BBoxAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

function BBoxAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: BBoxAnnotationDeleteMenuItemProps & MenuItemProps) {
  // event handlers
  const deleteMutation = BboxAnnotationHooks.useDeleteBBoxAnnotation();
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the BBoxAnnotation ${annotationId}? You can reassign it later!`,
        onAccept: () => {
          deleteMutation.mutate({ bboxToDelete: annotationId });
        },
      });

      if (onClick) onClick();
    },
    [annotationId, deleteMutation, onClick],
  );

  return (
    <MenuItem onClick={handleClick} {...props}>
      <ListItemIcon>
        {getIconComponent(Icon.DELETE, {
          fontSize: "small",
        })}
      </ListItemIcon>
      <ListItemText>Delete bbox annotation</ListItemText>
    </MenuItem>
  );
}

export default BBoxAnnotationDeleteMenuItem;
