import { useOpenConfirmationDialog } from "@core/notification";
import { SentenceAnnotationHooks } from "@core/sentence-annotation";
import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { MouseEventHandler } from "react";
import { AnnotationRouteAPI } from "../../../_hooks/annotationRouteAPI";

interface SentenceAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

export function SentenceAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: SentenceAnnotationDeleteMenuItemProps & MenuItemProps) {
  const projectId = AnnotationRouteAPI.useParams({ select: (params) => params.projectId });
  const deleteMutation = SentenceAnnotationHooks.useDeleteSentenceAnnotation();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleClick: MouseEventHandler<HTMLLIElement> = (event) => {
    event.stopPropagation();

    openConfirmationDialog({
      text: `Do you really want to remove the SentenceAnnotation ${annotationId}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate({ projectId, sentAnnoToDelete: annotationId });
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
