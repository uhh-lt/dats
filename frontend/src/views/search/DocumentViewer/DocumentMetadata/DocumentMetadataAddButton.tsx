import { useQueryClient } from "@tanstack/react-query";
import MetadataHooks from "../../../../api/MetadataHooks";
import SnackbarAPI from "../../../../features/snackbar/SnackbarAPI";
import { SourceDocumentMetadataRead } from "../../../../api/openapi";
import { QueryKey } from "../../../../api/QueryKey";
import React, { useCallback } from "react";
import { Grid } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Add } from "@mui/icons-material";

interface DocumentMetadataAddButtonProps {
  sdocId: number;
}

function DocumentMetadataAddButton({ sdocId }: DocumentMetadataAddButtonProps) {
  // mutations
  const queryClient = useQueryClient();
  const createMutation = MetadataHooks.useCreateMetadata({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data: SourceDocumentMetadataRead) => {
      queryClient.invalidateQueries([QueryKey.METADATA, data.id]);
      queryClient.invalidateQueries([QueryKey.SDOC_METADATAS, data.source_document_id]);
      SnackbarAPI.openSnackbar({
        text: `Added metadata to SourceDocument ${data.source_document_id}`,
        severity: "success",
      });
    },
  });

  const handleAddMetadata = useCallback(() => {
    createMutation.mutate({
      requestBody: {
        source_document_id: sdocId,
        read_only: false,
        key: "Key",
        value: "Value",
      },
    });
  }, [createMutation, sdocId]);

  return (
    <Grid item md={2}>
      <LoadingButton
        sx={{ px: 1, justifyContent: "start" }}
        loading={createMutation.isLoading}
        loadingPosition="start"
        startIcon={<Add />}
        variant="outlined"
        fullWidth
        onClick={handleAddMetadata}
      >
        Add
      </LoadingButton>
    </Grid>
  );
}
export default DocumentMetadataAddButton;
