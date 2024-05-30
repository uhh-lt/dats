import DeleteIcon from "@mui/icons-material/Delete";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useCallback } from "react";
import ProjectMetadataHooks from "../../../../api/ProjectMetadataHooks.ts";
import ConfirmationAPI from "../../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../../features/SnackbarDialog/useOpenSnackbar.ts";

interface ProjectMetadataDeleteButtonProps {
  metadataId: number;
}

function ProjectMetadataDeleteButton({ metadataId, ...props }: ProjectMetadataDeleteButtonProps & IconButtonProps) {
  // mutations
  const deleteMutation = ProjectMetadataHooks.useDeleteMetadata();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const handleDeleteMetadata = useCallback(() => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete the ProjectMetadata ${metadataId}? This will remove metadata from all corresponding documents. This action cannot be undone!`,
      onAccept: () => {
        const mutation = deleteMutation.mutate;
        mutation(
          {
            metadataId: metadataId,
          },
          {
            onSuccess: (data) => {
              openSnackbar({
                text: `Deleted Metadata ${data.id} from Project ${data.project_id}`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  }, [deleteMutation.mutate, metadataId, openSnackbar]);

  return (
    <Tooltip title="Delete">
      <span>
        <IconButton {...props} onClick={handleDeleteMetadata} disabled={deleteMutation.isPending || props.disabled}>
          <DeleteIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default ProjectMetadataDeleteButton;
