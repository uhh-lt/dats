import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { MouseEventHandler } from "react";

interface SpanAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

export function SpanAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: SpanAnnotationDeleteMenuItemProps & MenuItemProps) {
  const deleteMutation = SpanAnnotationHooks.useDeleteSpanAnnotation();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleClick: MouseEventHandler = (event) => {
    event.stopPropagation();

    openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotationId}? You can reassign it later!`,
      type: "DELETE",
      onAccept: () => {
        deleteMutation.mutate({ spanAnnotationToDelete: annotationId });
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
