import { getIconComponent, Icon } from "@components/icons";
import { BboxAnnotationHooks } from "@core/bbox-annotation";
import { useOpenConfirmationDialog } from "@core/notification";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { MouseEventHandler, useCallback } from "react";
import { AnnotationRouteAPI } from "../../../_hooks/annotationRouteAPI";

interface BBoxAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

export function BBoxAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: BBoxAnnotationDeleteMenuItemProps & MenuItemProps) {
  // event handlers
  const openConfirmationDialog = useOpenConfirmationDialog();
  const projectId = AnnotationRouteAPI.useParams({ select: (params) => params.projectId });
  const deleteMutation = BboxAnnotationHooks.useDeleteBBoxAnnotation();
  const handleClick: MouseEventHandler<HTMLLIElement> = useCallback(
    (event) => {
      event.stopPropagation();

      openConfirmationDialog({
        text: `Do you really want to remove the BBoxAnnotation ${annotationId}? You can reassign it later!`,
        onAccept: () => {
          deleteMutation.mutate({ projectId, bboxToDelete: annotationId });
        },
      });

      if (onClick) onClick();
    },
    [annotationId, deleteMutation, onClick, openConfirmationDialog, projectId],
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
