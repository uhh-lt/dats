import DeleteIcon from "@mui/icons-material/Delete";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useCallback } from "react";
import ProjectMetadataHooks from "../../../../api/ProjectMetadataHooks";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI";
import ConfirmationAPI from "../../../../features/ConfirmationDialog/ConfirmationAPI";

interface ProjectMetadataDeleteButtonProps {
  metadataId: number;
}

function ProjectMetadataDeleteButton({ metadataId, ...props }: ProjectMetadataDeleteButtonProps & IconButtonProps) {
  // mutations
  const deleteMutation = ProjectMetadataHooks.useDeleteMetadata();

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
              SnackbarAPI.openSnackbar({
                text: `Deleted Metadata ${data.id} from Project ${data.project_id}`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  }, [deleteMutation.mutate, metadataId]);

  return (
    <Tooltip title="Delete">
      <span>
        <IconButton {...props} onClick={handleDeleteMetadata} disabled={deleteMutation.isLoading || props.disabled}>
          <DeleteIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default ProjectMetadataDeleteButton;
