import MetadataHooks from "../../../../api/MetadataHooks";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI";
import React, { useCallback } from "react";
import { Grid } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Add } from "@mui/icons-material";

interface DocumentMetadataAddButtonProps {
  sdocId: number;
}

function DocumentMetadataAddButton({ sdocId }: DocumentMetadataAddButtonProps) {
  // mutations
  const createMutation = MetadataHooks.useCreateMetadata();

  const handleAddMetadata = useCallback(() => {
    const mutation = createMutation.mutate;
    mutation(
      {
        requestBody: {
          source_document_id: sdocId,
          read_only: false,
          key: "Key",
          value: "Value",
        },
      },
      {
        onSuccess: (data) => {
          SnackbarAPI.openSnackbar({
            text: `Added metadata to SourceDocument ${data.source_document_id}`,
            severity: "success",
          });
        },
        onError: (error: any) => {
          SnackbarAPI.openSnackbar({
            text: error.status === 409 ? "Key already exists" : "Could not add metadata",
            severity: "error",
          });
        },
      }
    );
  }, [createMutation.mutate, sdocId]);

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
