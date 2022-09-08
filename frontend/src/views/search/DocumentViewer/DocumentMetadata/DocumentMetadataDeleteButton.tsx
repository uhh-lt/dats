import { IconButtonProps } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import MetadataHooks from "../../../../api/MetadataHooks";
import SnackbarAPI from "../../../../features/snackbar/SnackbarAPI";
import { SourceDocumentMetadataRead } from "../../../../api/openapi";
import { QueryKey } from "../../../../api/QueryKey";
import React, { useCallback } from "react";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

interface DocumentMetadataDeleteButtonProps {
  metadataId: number;
}

function DocumentMetadataDeleteButton({ metadataId, ...props }: DocumentMetadataDeleteButtonProps & IconButtonProps) {
  // mutations
  const queryClient = useQueryClient();
  const deleteMutation = MetadataHooks.useDeleteMetadata({
    onSuccess: (data: SourceDocumentMetadataRead) => {
      queryClient.invalidateQueries([QueryKey.METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, data.source_document_id]);
      SnackbarAPI.openSnackbar({
        text: `Deleted Metadata ${data.id} from SourceDocument ${data.source_document_id}`,
        severity: "success",
      });
    },
  });

  const handleDeleteMetadata = useCallback(() => {
    deleteMutation.mutate({
      metadataId: metadataId,
    });
  }, [deleteMutation, metadataId]);

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
