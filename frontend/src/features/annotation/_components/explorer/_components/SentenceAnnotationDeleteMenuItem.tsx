import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { MouseEventHandler } from "react";

interface SentenceAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

export function SentenceAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: SentenceAnnotationDeleteMenuItemProps & MenuItemProps) {
  const deleteMutation = SentenceAnnotationHooks.useDeleteSentenceAnnotation();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleClick: MouseEventHandler<HTMLLIElement> = (event) => {
    event.stopPropagation();

    openConfirmationDialog({
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
