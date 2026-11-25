import { useOpenConfirmationDialog } from "@core/notification";
import { SpanAnnotationHooks } from "@core/span-annotation";
import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { MouseEventHandler } from "react";
import { AnnotationRouteAPI } from "../../../_hooks/annotationRouteAPI";

interface SpanAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

export function SpanAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: SpanAnnotationDeleteMenuItemProps & MenuItemProps) {
  const projectId = AnnotationRouteAPI.useParams({ select: (params) => params.projectId });
  const deleteMutation = SpanAnnotationHooks.useDeleteSpanAnnotation();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleClick: MouseEventHandler = (event) => {
    event.stopPropagation();

    openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotationId}? You can reassign it later!`,
      type: "DELETE",
      onAccept: () => {
        deleteMutation.mutate({ projectId, spanAnnotationToDelete: annotationId });
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
