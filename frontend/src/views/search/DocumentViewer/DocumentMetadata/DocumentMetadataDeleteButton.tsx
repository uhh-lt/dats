import { IconButtonProps } from "@mui/material";
import MetadataHooks from "../../../../api/MetadataHooks";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI";
import React, { useCallback } from "react";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

interface DocumentMetadataDeleteButtonProps {
  metadataId: number;
}

function DocumentMetadataDeleteButton({ metadataId, ...props }: DocumentMetadataDeleteButtonProps & IconButtonProps) {
  // mutations
  const deleteMutation = MetadataHooks.useDeleteMetadata();

  const handleDeleteMetadata = useCallback(() => {
    const mutation = deleteMutation.mutate;
    mutation(
      {
        metadataId: metadataId,
      },
      {
        onSuccess: (data) => {
          SnackbarAPI.openSnackbar({
            text: `Deleted Metadata ${data.id} from SourceDocument ${data.source_document_id}`,
            severity: "success",
          });
        },
      }
    );
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

export default DocumentMetadataDeleteButton;
